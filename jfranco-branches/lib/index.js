// @javierfrancoleal/branches — the branch agents: prepare for the professional.
// Created by J.Franco. Registers a bundled skill provider on the host skill
// registry, following the @deepseek-ai/dsh-skill-badge provider pattern.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "jfranco-branches";
const SKILL_BODY_URL = new URL("../assets/branches.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "branches",
  description: "The branch agents of the J.Franco agentic workflow: one agent per branch of business administration (legal, accounting, finance, marketing, economics). Each agent PREPARES the work from the client's own silo under a deterministic cage; the certified professional VALIDATES and signs. The agent never gives a legal opinion, never signs a return, never recommends an investment — it prepares, explains and cites, and the license signs.",
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
