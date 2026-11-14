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
import { existsSync, appendFileSync, mkdirSync, readFileSync, chmodSync, openSync, closeSync, writeSync, unlinkSync } from "node:fs";
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
const EDIT_LOCK_FILE = join(homedir(), ".dsh", "antigravity", "edit.lock");
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

// True only inside a Git work tree (handles subdirectories, e.g. cwd =
// "plugins/jfranco-antigravity" with ".git" at "plugins/.git").
function gitIsInsideWorkTree(cwd) {
  return new Promise((resolvePromise) => {
    const child = spawn("git", ["rev-parse", "--is-inside-work-tree"], { cwd });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.on("close", (code) => resolvePromise(code === 0 && out.trim() === "true"));
    child.on("error", () => resolvePromise(false));
  });
}

// True only when `git status --porcelain` succeeds (exit 0) AND is empty, so
// `git diff` after an accept-edits run shows exactly what Antigravity changed.
function gitIsClean(cwd) {
  return new Promise((resolvePromise) => {
    const child = spawn("git", ["status", "--porcelain"], { cwd });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.on("close", (code) => resolvePromise(code === 0 && out.trim() === ""));
    child.on("error", () => resolvePromise(false));
  });
}

// Resolve the Git work-tree top level (or null when not inside one). Used to
// prefer a repo-local `.dsh/dialogue.md` ledger over the home one.
function gitTopLevel(cwd) {
  return new Promise((resolvePromise) => {
    const child = spawn("git", ["rev-parse", "--show-toplevel"], { cwd });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.on("close", (code) => resolvePromise(code === 0 ? out.trim() || null : null));
    child.on("error", () => resolvePromise(null));
  });
}

const DISK_LOCK_RE = /^-\s*DISK_LOCK:\s*(NONE|GEMINI|DEEPSEEK)\b/m;

// Pure parser: returns the active DISK_LOCK token from ledger text. Prefers the
// `## Status` value so a stale Log entry cannot shadow the live one; falls back
// to any `- DISK_LOCK:` line. Never touches the filesystem.
function parseDiskLock(text) {
  if (typeof text !== "string") return null;
  const status = text.match(/^##\s+Status\s*$(?:\r?\n)+([\s\S]*?)(?=^##\s|(?![\s\S]))/mi);
  if (status) {
    const m = status[1].match(DISK_LOCK_RE);
    if (m) return m[1];
  }
  const fallback = text.match(DISK_LOCK_RE);
  return fallback ? fallback[1] : null;
}

// Pure lookup order for the active ledger, most-specific first: the Git
// top-level's `.dsh/dialogue.md`, then the cwd's, then the home one. Duplicate
// candidates (e.g. when the Git top level equals the cwd) are collapsed.
function ledgerCandidates({ cwd, gitTopLevel: top, home }) {
  const seen = new Set();
  const out = [];
  for (const p of [
    top && join(top, ".dsh", "dialogue.md"),
    join(cwd, ".dsh", "dialogue.md"),
    join(home, ".dsh", "dialogue.md"),
  ]) {
    if (!p || seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

// First existing ledger in the lookup order, or null. Returns `{ path, text }`.
async function resolveActiveLedger(cwd) {
  const top = await gitTopLevel(cwd);
  for (const path of ledgerCandidates({ cwd, gitTopLevel: top, home: homedir() })) {
    if (!existsSync(path)) continue;
    let text = "";
    try { text = readFileSync(path, "utf8"); } catch { text = ""; }
    return { path, text };
  }
  return null;
}

// Single-writer mutex via an exclusive O_EXCL PID lockfile, so only one
// antigravity(edit) runs at a time even when the caller holds DEEPSEEK (or the
// ledger is absent / NONE). `path` is injectable for tests; default is the
// user-level `~/.dsh/antigravity/edit.lock`.
function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e && e.code === "EPERM"; }
}

function acquireEditLock(path = EDIT_LOCK_FILE) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(path, "wx", 0o600);
      try { writeSync(fd, String(process.pid)); } finally { closeSync(fd); }
      return { ok: true, path };
    } catch (e) {
      if (!e || e.code !== "EEXIST") return { ok: false, error: e && e.message ? e.message : String(e), path };
      // Stale check: reclaim the lock when its recorded PID is gone.
      let stale = false;
      try {
        const pid = Number(String(readFileSync(path, "utf8")).trim());
        stale = !isPidAlive(pid);
      } catch { stale = true; }
      if (!stale) return { ok: false, busy: true, path };
      try { unlinkSync(path); } catch { return { ok: false, busy: true, path }; }
    }
  }
  return { ok: false, busy: true, path };
}

function releaseEditLock(path = EDIT_LOCK_FILE) {
  try { unlinkSync(path); } catch {}
}

// Run agy once, session-scoped permissions, JSON output, bounded timeout.
function runAgy({ mode, prompt, cwd, effort, timeoutS, model, conversationId }) {
  return new Promise((resolvePromise) => {
    const args = [
      "--add-dir", cwd,
      "--mode", mode,
      "--output-format", "json",
      "--print-timeout", `${timeoutS}s`,
      "--effort", effort,
    ];
    if (model) args.push("--model", model);
    if (conversationId) args.push("--conversation", conversationId);
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
          + "action=edit implements with accept-edits (SEMI-AUTOMATIC: it WRITES files, review with git diff after, requires a clean Git tree); "
          + "action=audit cross-reviews the uncommitted git diff for bugs / hallucinated APIs / over-engineering (GREEN). "
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
          conversationId: { type: "string", description: "Optional conversation ID to resume a previous Antigravity conversation (passed as --conversation)." },
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
          const conversationId = String(args.conversationId || "").trim();
          const prompt = String(args.prompt || "").trim();
          if (!prompt) return { text: "antigravity requires a non-empty prompt." };

          const ACTIONS = ["plan", "edit", "audit"];
          if (!ACTIONS.includes(args.action)) {
            return { text: `antigravity: unknown action "${args.action}" (expected ${ACTIONS.join(" | ")}).` };
          }

          const isEdit = args.action === "edit";
          const isAudit = args.action === "audit";
          const tier = isEdit ? "SEMI" : "GREEN";
          if (isEdit || isAudit) {
            const insideGit = await gitIsInsideWorkTree(cwd);
            if (!insideGit) {
              return { text: `antigravity ${args.action} requires a Git repository at ${cwd}.` };
            }
          }

          let releaseLock = null;
          if (isEdit) {
            const clean = await gitIsClean(cwd);
            if (!clean) {
              return { text: `antigravity edit refused: ${cwd} has uncommitted changes. Commit or stash first so git diff shows only what Antigravity touched.` };
            }

            // DISK_LOCK ledger guard: refuse when the Antigravity IDE holds the
            // write lock (single writer to the repo). DEEPSEEK / NONE / absent
            // are allowed — DeepSeek is the synchronous caller.
            const ledger = await resolveActiveLedger(cwd);
            const ledgerPath = ledger ? ledger.path : null;
            const ledgerLock = ledger ? parseDiskLock(ledger.text) : null;
            if (ledgerLock === "GEMINI") {
              return { text: `antigravity edit refused: DISK_LOCK is held by GEMINI in ${ledgerPath}.` };
            }

            // Single-writer mutex: only one antigravity(edit) at a time.
            const lock = acquireEditLock();
            if (!lock.ok) {
              return { text: `antigravity edit refused: another edit is already in progress (lock: ${lock.path}).` };
            }
            releaseLock = () => releaseEditLock();

            writeAudit("antigravity", tier, cwd, prompt, {
              mode: "accept-edits", effort, model,
              phase: "start",
              requestedConversationId: conversationId || null,
              ledgerLock: ledgerLock ?? null,
              ledgerPath: ledgerPath ?? null,
            });
          } else if (isAudit) {
            writeAudit("antigravity", tier, cwd, prompt, {
              mode: "audit", effort, model, phase: "start", requestedConversationId: conversationId || null,
            });
          } else {
            writeAudit("antigravity", tier, cwd, prompt, {
              mode: "plan", effort, model, phase: "start", requestedConversationId: conversationId || null,
            });
          }

          const auditPrompt = isAudit
            ? `${prompt}\n\nReview the UNCOMMITTED changes in this workspace (git diff). Report specific issues with file/line references: bugs, hallucinated APIs, over-engineering, and anything that violates the project's documented conventions.`
            : prompt;

          let res;
          try {
            res = await runAgy({
              mode: isEdit ? "accept-edits" : "plan",
              prompt: auditPrompt,
              cwd,
              effort,
              timeoutS,
              model,
              conversationId,
            });
          } catch (e) {
            res = { code: -1, error: e && e.message ? e.message : String(e) };
          } finally {
            if (releaseLock) releaseLock();
          }

          // Post-execution audit trail. Wrapped so an audit failure never drops
          // the tool's actual result.
          try {
            const deniedCount = res.parsed?.denied_actions?.length ? res.parsed.denied_actions.length : undefined;
            writeAudit("antigravity_result", tier, cwd, prompt, {
              mode: isEdit ? "accept-edits" : isAudit ? "audit" : "plan",
              effort, model,
              phase: "end",
              status: res.parsed?.status ?? (res.error ? "error" : res.code !== 0 ? `exit_${res.code}` : null),
              conversationId: res.parsed?.conversation_id || conversationId || null,
              durationSeconds: res.parsed?.duration_seconds ?? null,
              ...(deniedCount != null ? { deniedCount } : {}),
            });
          } catch { /* audit write must not affect the tool result */ }

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

export { apply, inject, name, parseDiskLock, ledgerCandidates, acquireEditLock, releaseEditLock, isPidAlive };
