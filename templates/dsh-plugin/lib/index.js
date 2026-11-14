// @javierfrancoleal/__NAME__ — host half (Node).
// Register skills, commands, services, or scheduled work here.
//
// Skill (needs `inject = ["skills"]` and peerDep @deepseek-ai/dsh-skill):
//   import { readFile } from "node:fs/promises";
//   import { fileURLToPath } from "node:url";
//   import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";
//   ctx.skills.registerProvider(() => provider);
//
// Command:
//   ctx.get("commands")?.register({
//     definitionId: "@javierfrancoleal/__NAME__",
//     name: "__NAME__",
//     description: "…",
//     input: { hint: "[…]" },
//     handler: () => ({ text: "…" }),
//   });
//
// Scheduled work:
//   ctx.effect(() => { const t = setInterval(run, ms); return () => clearInterval(t); }, "label");
//
// Log: ctx.logger.info / ctx.logger.warn.
//
// Per-agent tool (model-visible; needs peerDep @deepseek-ai/dsh-tools):
//   import { defineTool } from "@deepseek-ai/dsh-tools";
//   ctx.on("agent/created", ({ agent }) => {          // destructure the payload
//     if (!agent?.ctx) return;
//     agent.ctx.effect(() => {
//       const unregister = agent.ctx.tools.register(defineTool({ /* ... */ }));
//       return () => unregister();
//     }, "__NAME__: tool");
//   });
//   ⚠ `agent/created` / `agent/disposed` / `agent/status` emit `{ agent, source, signal }`,
//     NOT the agent directly — always `({ agent }) =>`, never `(agent) => agent.ctx`.

const name = "__NAME__";

function apply(ctx) {
  // Register your host behavior here.
}

export { apply, name };
