// @javierfrancoleal/antigravity — the CODE hands of the J.Franco suite.
// Delegates coding tasks to Google Antigravity (agy CLI) under the guardrails.
//
//   plan (--mode plan)              → GREEN: read-only analysis/proposal, logged.
//   edit (--mode accept-edits)      → SEMI-AUTOMATIC ⚑: writes files, review after
//                                     with git diff; REQUIRES a clean Git tree.
//   auto / --dangerously-skip-permissions → RED: never exposed to the agent.
//
// Permissions are SESSION-SCOPED via `--settings '{"toolPermission":
// "proceed-in-sandbox"}'` + `--sandbox` — the user's global settings.json is
// never touched. Zero npm dependencies, zero eval.
import { readFile } from "node:fs/promises";
import { existsSync, appendFileSync, mkdirSync, readFileSync, chmodSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";
import { defineTool } from "@deepseek-ai/dsh-tools";

const name = "antigravity";
const inject = ["skills", "tools"];

const PROVIDER_NAME = "jfranco-antigravity";
const SKILL_BODY_URL = new URL("../assets/antigravity.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};
const CANDIDATE = {
  name: "antigravity",
  description:
    "Delegate coding tasks to Google Antigravity (agy CLI) under the J.Franco guardrails: plan (read-only) is GREEN, edit (accept-edits) is SEMI-AUTOMATIC and requires a clean Git tree, auto/dangerously-skip-permissions is RED (never by the agent).",
  invocation: { modelInvocable: true, userInvocable: true },
  provider: PROVIDER_NAME,
  source: "bundled",
  resourceBase: RESOURCE_BASE,
  rank: BUNDLED_SKILL_RANK,
  locator: SKILL_BODY_URL,
};
const provider = {
  name: PROVIDER_NAME,
  list: () => Promise.resolve([CANDIDATE]),
  async get() { return { ...CANDIDATE, content: await readFile(SKILL_BODY_URL, "utf8") }; },
};

const AUDIT_FILE = join(homedir(), ".dsh", "antigravity", "audit.jsonl");
/** Resolve the `agy` binary even when GUI Electron lacks `~/.local/bin` on PATH. */
function resolveAgyBin() {
  if (process.env.ANTIGRAVITY_CLI) return process.env.ANTIGRAVITY_CLI;
  const candidates = [
    join(homedir(), ".local", "bin", "agy"),
    "/Applications/Gemini.app/Contents/Helpers/agy",
  ];
  return candidates.find((p) => existsSync(p)) || "agy";
}
const AGY = resolveAgyBin();
const DEFAULT_TIMEOUT_S = 300;
const DEFAULT_EFFORT = "medium";

const ok = (text) => ({ kind: "success", text });
const err = (text) => ({ kind: "error", text });

// Hash-chained audit trail (tamper-evident), same pattern as cockpit-browser.
function writeAudit(action, tier, target, value, meta = {}) {
  const dir = dirname(AUDIT_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  const isNew = !existsSync(AUDIT_FILE);
  let prevHash = "";
  if (!isNew) {
    try {
      const lines = readFileSync(AUDIT_FILE, "utf8").trim().split("\n").filter(Boolean);
      prevHash = JSON.parse(lines[lines.length - 1]).hash || "";
    } catch {}
  }
  const entry = { ts: new Date().toISOString(), action, tier, target, value, ...meta };
  const hash = createHash("sha256").update(prevHash + JSON.stringify(entry)).digest("hex");
  appendFileSync(AUDIT_FILE, JSON.stringify({ ...entry, prevHash, hash }) + "\n", { encoding: "utf8", mode: 0o600 });
  if (isNew) { try { chmodSync(AUDIT_FILE, 0o600); } catch {} }
}

// True only when `git status --porcelain` is empty (so `git diff` after an
// accept-edits run shows exactly what Antigravity changed).
function gitIsClean(cwd) {
  return new Promise((resolvePromise) => {
    const child = spawn("git", ["status", "--porcelain"], { cwd });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.on("close", () => resolvePromise(out.trim() === ""));
    child.on("error", () => resolvePromise(false));
  });
}

// Run agy once, session-scoped permissions, JSON output, bounded timeout.
function runAgy({ mode, prompt, cwd, effort, timeoutS, model }) {
  return new Promise((resolvePromise) => {
    const args = [
      "--add-dir", cwd,
      "--mode", mode,
      "--output-format", "json",
      "--print-timeout", `${timeoutS}s`,
      "--effort", effort,
    ];
    if (model) args.push("--model", model);
    args.push(
      "--sandbox",
      "--settings", JSON.stringify({ toolPermission: "proceed-in-sandbox" }),
      "-p", prompt,
    );
    const child = spawn(AGY, args, { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    const timer = setTimeout(() => { try { child.kill("SIGTERM"); } catch {} }, timeoutS * 1000 + 10000);
    child.on("close", (code) => {
      clearTimeout(timer);
      let parsed = null;
      try { parsed = JSON.parse(stdout.trim()); } catch {}
      resolvePromise({ code, stdout, stderr, parsed });
    });
    child.on("error", (e) => { clearTimeout(timer); resolvePromise({ code: -1, error: e && e.message ? e.message : String(e) }); });
  });
}

function apply(ctx) {
  ctx.skills.registerProvider(() => provider);

  // Per-agent registration so the tool is model-visible (same as cockpit).
  // `agent/created` emits payload `{ agent, source, signal }`, not `agent` directly.
  ctx.on("agent/created", ({ agent }) => {
    if (!agent?.ctx) return;
    agent.ctx.effect(() => {
      const unregister = agent.ctx.tools.register(defineTool({
        name: "antigravity",
        description:
          "Delegate a coding task to Google Antigravity (agy CLI) under the J.Franco guardrails. "
          + "action=plan analyzes and proposes WITHOUT touching files (GREEN, read-only); "
          + "action=edit implements with accept-edits (SEMI-AUTOMATIC: it WRITES files, review with git diff after, requires a clean Git tree). "
          + "The agent never uses auto or --dangerously-skip-permissions (RED).",
        parameters: {
          action: {
            type: "string",
            required: true,
            enum: ["plan", "edit", "audit"],
            description: "plan = read-only analysis/proposal; edit = implement (writes files, review after); audit = cross-review the uncommitted git diff for bugs / hallucinated APIs / over-engineering.",
          },
          prompt: { type: "string", required: true, description: "The task for Antigravity." },
          cwd: { type: "string", description: "Working directory (must be a Git repo for edit/audit). Defaults to the process cwd." },
          effort: { type: "string", enum: ["low", "medium", "high", "xhigh", "max"], description: "Reasoning effort; lower is faster (default medium)." },
          model: { type: "string", description: "Model override (e.g. a Gemini 4 Hydrogen or Argon id). Omit for the account default." },
        },
        output: {
          schema: {
            type: "object",
            additionalProperties: false,
            properties: { text: { type: "string", required: true } },
          },
          render: (_args, value) => [{ type: "text", text: value.text }],
          presentationMeta: (_args, _value) => ({}),
        },
        async execute(args) {
          const cwd = resolve(String(args.cwd || process.cwd()));
          const effort = args.effort || DEFAULT_EFFORT;
          const timeoutS = DEFAULT_TIMEOUT_S;
          const model = args.model || null;
          const prompt = String(args.prompt || "").trim();
          if (!prompt) return { text: "antigravity requires a non-empty prompt." };

          const isEdit = args.action === "edit";
          const isAudit = args.action === "audit";
          if ((isEdit || isAudit) && !existsSync(join(cwd, ".git"))) {
            return { text: `antigravity ${args.action} requires a Git repository at ${cwd}.` };
          }
          if (isEdit) {
            const clean = await gitIsClean(cwd);
            if (!clean) {
              return { text: `antigravity edit refused: ${cwd} has uncommitted changes. Commit or stash first so git diff shows only what Antigravity touched.` };
            }
            writeAudit("antigravity", "SEMI", cwd, prompt, { mode: "accept-edits", effort });
          } else if (isAudit) {
            writeAudit("antigravity", "GREEN", cwd, prompt, { mode: "audit", effort });
          } else {
            writeAudit("antigravity", "GREEN", cwd, prompt, { mode: "plan", effort });
          }

          const auditPrompt = isAudit
            ? `${prompt}\n\nReview the UNCOMMITTED changes in this workspace (git diff). Report specific issues with file/line references: bugs, hallucinated APIs, over-engineering, and anything that violates the project's documented conventions.`
            : prompt;

          const res = await runAgy({
            mode: isEdit ? "accept-edits" : "plan",
            prompt: auditPrompt,
            cwd,
            effort,
            timeoutS,
            model,
          });

          if (res.error) return { text: `antigravity failed to launch: ${res.error}` };
          if (res.parsed) {
            const p = res.parsed;
            const head = [];
            if (p.status) head.push(`status: ${p.status}`);
            if (p.conversation_id) head.push(`conversation: ${p.conversation_id}`);
            if (p.duration_seconds != null) head.push(`duration: ${p.duration_seconds}s`);
            if (p.denied_actions && p.denied_actions.length) head.push(`denied: ${p.denied_actions.map((d) => d.action).join(", ")}`);
            const body = p.response || "(no response produced)";
            return { text: (head.length ? head.join(" · ") + "\n\n" : "") + body };
          }
          return { text: (res.stdout || res.stderr || `agy exited ${res.code}`).slice(0, 4000) };
        },
      }));
      return () => unregister();
    }, "antigravity: tool");
  });
}

export { apply, inject, name };
