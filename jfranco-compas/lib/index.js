// @javierfrancoleal/compas — an organ of the J.Franco agentic workflow.
// Created by J.Franco. Registers the compas skill provider.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "javierfrancoleal-compas";
const SKILL_BODY_URL = new URL("../assets/compas.md", import.meta.url);
const RESOURCE_BASE = { kind: "directory", path: fileURLToPath(new URL("../assets/", import.meta.url)) };

const CANDIDATE = {
  name: "compas",
  description: "The platform optimizer organ of the J.Franco agentic workflow: audits Fanal against the optimization checklist distilled from DeepSeek Harness (one brain many skins, token gate, batched state, PWA cache, electron hardening, bundled runtime) and applies ONLY what makes sense for a sovereign agentic orchestration layer — never over-engineers.",
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

const name = "compas";
const inject = ["skills"];

function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
}

export { apply, inject, name };
