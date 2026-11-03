// @javierfrancoleal/forensics — an organ of the J.Franco agentic workflow.
// Created by J.Franco. Registers the forensics skill provider and, when the
// host command registry is available, the /forensics command.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "javierfrancoleal-forensics";
const SKILL_BODY_URL = new URL("../assets/forensics.md", import.meta.url);
const RESOURCE_BASE = { kind: "directory", path: fileURLToPath(new URL("../assets/", import.meta.url)) };

const CANDIDATE = {
  name: "forensics",
  description: "The code-forensics organ of the J.Franco agentic workflow: trace one feature end to end, read the fossil record, and produce a plain-language dossier.",
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

const name = "forensics";
const inject = ["skills"];

function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
  const commands = ctx.get("commands");
  if (commands !== undefined) {
    commands.register({
      definitionId: "@javierfrancoleal/forensics",
      name: "forensics",
      description: "Dig into one feature and explain how and why it was built",
      input: { hint: "[the feature, e.g. the virtual register]", attachments: true },
      handler: () => ({ text: "Forensics ON. Name one feature and I will dig: layers, the end-to-end trace, the history that explains it, and a dossier you can order from." }),
    });
  }
}

export { apply, inject, name };
