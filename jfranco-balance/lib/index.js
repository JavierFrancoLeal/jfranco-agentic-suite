// @javierfrancoleal/balance — host half (Node).
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
//     definitionId: "@javierfrancoleal/balance",
//     name: "balance",
//     description: "…",
//     input: { hint: "[…]" },
//     handler: () => ({ text: "…" }),
//   });
//
// Scheduled work:
//   ctx.effect(() => { const t = setInterval(run, ms); return () => clearInterval(t); }, "label");
//
// Log: ctx.logger.info / ctx.logger.warn.

const name = "balance";

function apply(ctx) {
  // Register your host behavior here.
}

export { apply, name };
