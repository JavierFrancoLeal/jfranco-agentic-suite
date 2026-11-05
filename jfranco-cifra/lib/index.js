// @javierfrancoleal/cifra — an organ of the J.Franco agentic workflow.
// Created by J.Franco. Registers the cifra skill provider.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "javierfrancoleal-cifra";
const SKILL_BODY_URL = new URL("../assets/cifra.md", import.meta.url);
const RESOURCE_BASE = { kind: "directory", path: fileURLToPath(new URL("../assets/", import.meta.url)) };

const CANDIDATE = {
  name: "cifra",
  description: "The host-signature organ of the J.Franco agentic workflow: detects the host (operating system and form factor) where Fanal runs, adapts texts, instructions and layout per host (macOS/Windows/Linux/iOS/Android, laptop/tablet/phone), and audits the signature visibly — never changes the flow.",
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

const name = "cifra";
const inject = ["skills"];

function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
}

export { apply, inject, name };
