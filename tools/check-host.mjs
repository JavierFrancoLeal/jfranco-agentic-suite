// check-host.mjs — guard for a DSH plugin's HOST half (lib/index.js).
// Usage: node check-host.mjs <lib/index.js>
//
// Two layers:
//   1. STATIC (fail-fast): flags any `agent/created` / `agent/disposed` /
//      `agent/status` handler whose first argument is NOT destructured
//      (`({ agent }) =>`). That signature is exactly what caused the
//      2026-11-12 (cockpit-browser) and 2026-11-14 (antigravity) crashes:
//      `agent/created` emits a PAYLOAD `{ agent, source, signal }`, never the
//      agent directly, so `(agent) => agent.ctx.effect(...)` throws
//      `TypeError: Cannot read properties of undefined (reading 'effect')`.
//   2. RUNTIME: imports the plugin with the baseline peer deps mocked, runs
//      `apply(ctx)` against a mock context, then fires `agent/created` with a
//      realistic `{ agent: { ctx }, source, signal }` payload AND a degraded
//      `{}` payload, asserting no TypeError is thrown and that a per-agent tool
//      registers.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const file = process.argv[2];
if (!file) { console.error("usage: node check-host.mjs <lib/index.js>"); process.exit(2); }

const source = readFileSync(file, "utf8");
const failures = [];
const warnings = [];

// A plugin's apply() may start servers/timers as a side effect (e.g. the
// cockpit-browser WebSocket bridge binds a real port). Never let a stray async
// 'error' event crash the check, and always force-exit so those handles die.
process.on("uncaughtException", (e) => { warnings.push("uncaught: " + (e && e.message ? e.message : String(e))); });
process.on("unhandledRejection", (e) => { warnings.push("unhandledRejection: " + (e && e.message ? e.message : String(e))); });

// ---- 1) static guard ----
// Matches `.on("agent/created",` / `.on('agent/disposed',` / `.on(`agent/status`,`
// (same quote char on both sides), then inspects the handler's parameter list.
const EVENT_RE = /\.on\(\s*(["'`])agent\/(?:created|disposed|status)\1\s*,/g;
{
  let m;
  while ((m = EVENT_RE.exec(source)) !== null) {
    const rest = source.slice(EVENT_RE.lastIndex);
    const fn = rest.match(/^\s*(?:async\s+)?(?:function\s*)?\(([^)]*)\)/);
    if (!fn) continue;
    const params = (fn[1] || "").trim();
    if (params !== "" && !params.includes("{")) {
      const line = source.slice(0, m.index).split("\n").length;
      failures.push(`line ${line}: handler does not destructure the payload — use \`({ agent }) =>\`, got \`(${params})\` (event emits \`{ agent, source, signal }\`)`);
    }
  }
}

// ---- 2) runtime guard ----
// Mock the baseline peer deps so the plugin imports without its live runtime.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@deepseek-ai/dsh-skill") return { url: "virtual:dsh-skill", shortCircuit: true };
    if (specifier === "@deepseek-ai/dsh-tools") return { url: "virtual:dsh-tools", shortCircuit: true };
    if (specifier === "@deepseek-ai/dsh-typert-protocol") return { url: "virtual:dsh-typert-protocol", shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "virtual:dsh-skill") {
      return { format: "module", shortCircuit: true, source: "export const BUNDLED_SKILL_RANK = 0; export default {};" };
    }
    if (url === "virtual:dsh-tools") {
      return { format: "module", shortCircuit: true, source: "export const defineTool = (def) => def; export default { defineTool };" };
    }
    if (url === "virtual:dsh-typert-protocol") {
      return { format: "module", shortCircuit: true, source: "export class TypertRemoteService { constructor(...args) { this.ctx = args[0]; } } export default { TypertRemoteService };" };
    }
    return nextLoad(url, context);
  },
});

function mockCtx() {
  const listeners = {};
  const ctx = {
    skills: { registerProvider: () => {} },
    commands: { register: () => () => {} },
    tools: { register: () => () => {} },
    logger: { info() {}, warn() {}, error() {} },
    get: () => undefined,
    effect: (fn) => { const r = fn(); return typeof r === "function" ? r : () => {}; },
    on: (event, handler) => { (listeners[event] ||= []).push(handler); return () => {}; },
    setInterval, setTimeout, clearInterval, clearTimeout,
  };
  return { ctx, listeners };
}

async function runRuntime() {
  let mod;
  try {
    mod = await import(pathToFileURL(resolve(file)).href);
  } catch (e) {
    warnings.push(`runtime skipped: could not import plugin (${e.message})`);
    return;
  }
  // Only a NAMED `apply` export matters here: a default-export Service plugin
  // (e.g. jfranco-balance) is a class whose inherited `.apply` is Function's,
  // not a plugin entry point — skip it rather than mistaking it for apply(ctx).
  if (typeof mod.apply !== "function") { warnings.push("runtime skipped: no named `apply` export (default-export Service plugin)"); return; }
  const apply = mod.apply;

  const { ctx, listeners } = mockCtx();
  try { apply(ctx); }
  catch (e) { warnings.push(`apply(ctx) threw: ${e.message}`); }

  const handlers = listeners["agent/created"] || [];
  if (handlers.length === 0) { console.log("  (no agent/created listener)"); return; }

  const seenTool = { name: null };
  const agentCtx = {
    tools: { register: (def) => { seenTool.name = def && def.name; return () => {}; } },
    effect: (fn) => { const r = fn(); return typeof r === "function" ? r : () => {}; },
    logger: { info() {}, warn() {}, error() {} },
    get: () => undefined,
  };
  const payloads = [
    { agent: { ctx: agentCtx }, source: "check-host", signal: new AbortController().signal },
    {},
  ];
  for (const [i, handler] of handlers.entries()) {
    for (const [j, payload] of payloads.entries()) {
      try { handler(payload); }
      catch (e) {
        const msg = String(e && e.message ? e.message : e);
        if (/undefined|Cannot read propert/i.test(msg)) {
          failures.push(`runtime: agent/created handler #${i + 1} threw on payload #${j + 1}: ${msg}`);
        } else {
          warnings.push(`runtime: agent/created handler #${i + 1} threw (non-signature): ${msg}`);
        }
      }
    }
  }
  if (seenTool.name) console.log(`  tool registered per-agent: ${seenTool.name}`);
}

await runRuntime();

if (warnings.length) console.error("warnings:\n- " + warnings.join("\n- "));
if (failures.length) { console.error("FAIL:\n- " + failures.join("\n- ")); process.exit(1); }
console.log("PASS");
process.exit(0);
