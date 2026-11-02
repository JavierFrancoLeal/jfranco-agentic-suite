// @javierfrancoleal/cortex — the nature-inspired layer of the J.Franco
// agentic workflow. Created by J.Franco. Registers the cortex skill
// provider and, when the host command registry is available, the /cortex
// command.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "javierfrancoleal-cortex";
const SKILL_BODY_URL = new URL("../assets/cortex.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "cortex",
  description: "The nature-inspired layer of the J.Franco agentic workflow: two hemispheres (Executor + Watcher), crossed verification (the proposer never verifies — like the right hemisphere controlling the left side of the body), predictive coding (report only surprises), and reflex-vs-cortex tiers. The human is the final cortex.",
  invocation: {
    modelInvocable: true,
    userInvocable: true,
  },
  provider: PROVIDER_NAME,
  source: "bundled",
  resourceBase: RESOURCE_BASE,
  rank: BUNDLED_SKILL_RANK,
  locator: SKILL_BODY_URL,
};

const provider = {
  name: PROVIDER_NAME,
  list: () => Promise.resolve([CANDIDATE]),
  async get(_candidate) {
    return {
      name: CANDIDATE.name,
      description: CANDIDATE.description,
      invocation: CANDIDATE.invocation,
      provider: CANDIDATE.provider,
      source: CANDIDATE.source,
      resourceBase: RESOURCE_BASE,
      content: await readFile(SKILL_BODY_URL, "utf8"),
    };
  },
};

const name = "cortex";
const inject = ["skills"];

const CORTEX_BRIEFING = [
  "Cortex ON.",
  "Two hemispheres: the Executor produces, the Watcher looks sideways.",
  "Crossed check: the hemisphere that proposes never verifies its own work.",
  "Predictive coding: predict the outcome, report only surprises.",
  "The human is the final cortex.",
].join(" ");

function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
  const commands = ctx.get("commands");
  if (commands !== undefined) {
    commands.register({
      definitionId: "@javierfrancoleal/cortex",
      name: "cortex",
      description: "Run the task with two hemispheres and a crossed verification check.",
      input: { hint: "[describe the task]", attachments: true },
      handler: () => ({ text: CORTEX_BRIEFING }),
    });
  }
}

export { apply, inject, name };
