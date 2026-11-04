// @javierfrancoleal/docfactory — an organ of the J.Franco agentic workflow.
// Created by J.Franco. Registers the docfactory skill provider.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "javierfrancoleal-docfactory";
const SKILL_BODY_URL = new URL("../assets/docfactory.md", import.meta.url);
const RESOURCE_BASE = { kind: "directory", path: fileURLToPath(new URL("../assets/", import.meta.url)) };

const CANDIDATE = {
  name: "docfactory",
  description: "The professional document factory of the J.Franco agentic workflow: consulting-grade layout techniques (boxes that never split pages, repeating table headers, no orphan lines, page numbers, metadata) + the editorial DNA (no meta-pointers, narrative flow, modest numbers, no over-promising) + the reusable docfx.py library.",
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

const name = "docfactory";
const inject = ["skills"];

function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
}

export { apply, inject, name };
