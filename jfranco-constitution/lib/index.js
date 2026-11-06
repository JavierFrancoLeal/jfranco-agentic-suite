// @javierfrancoleal/constitution — the co-created law of the house.
// Created by J.Franco. Registers a bundled skill provider on the host skill
// registry, following the @deepseek-ai/dsh-skill-badge provider pattern.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "jfranco-constitution";
const SKILL_BODY_URL = new URL("../assets/constitution.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "constitution",
  description: "The institutional organ of the J.Franco agentic workflow: the client's co-created constitution — philosophy, tone, policies, discount rules, the minimum operational price, the extreme conditions and the escalations. Every proposal must consult it first; every record must cite which rule it followed. The minimum price is the LAST option and offering it always requires the human. The constitution is versioned, exportable, and lives in the client's silo.",
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
  async list() {
    return [CANDIDATE];
  },
  async get() {
    return await readFile(SKILL_BODY_URL, "utf8");
  },
};

export function apply(ctx) {
  ctx.on("skills", (skills) => {
    skills.registerProvider(() => provider);
  });
}

export default apply;
