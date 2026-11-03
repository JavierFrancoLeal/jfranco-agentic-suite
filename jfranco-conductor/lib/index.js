// @javierfrancoleal/conductor — an organ of the J.Franco agentic workflow.
// Created by J.Franco. Registers the conductor skill provider and, when the
// host command registry is available, the /conductor command.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "javierfrancoleal-conductor";
const SKILL_BODY_URL = new URL("../assets/conductor.md", import.meta.url);
const RESOURCE_BASE = { kind: "directory", path: fileURLToPath(new URL("../assets/", import.meta.url)) };

const CANDIDATE = {
  name: "conductor",
  description: "The teacher organ of the J.Franco agentic workflow: detects friction between the user and the AI and delivers one micro-lesson with a prompt template and a clarifying question.",
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
  async get() {
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

const name = "conductor";
const inject = ["skills"];

function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
  const commands = ctx.get("commands");
  if (commands !== undefined) {
    commands.register({
      definitionId: "@javierfrancoleal/conductor",
      name: "conductor",
      description: "Teach one concept when a request gets stuck or vague",
      input: { hint: "[what the user said or asked]", attachments: true },
      handler: () => ({ text: "Conductor ON. When a request gets stuck or vague, I teach one concept in your language, give you the exact words, and ask one clarifying question." }),
    });
  }
}

export { apply, inject, name };
