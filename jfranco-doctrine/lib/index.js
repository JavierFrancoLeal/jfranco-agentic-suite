// @javierfrancoleal/doctrine — the laws every agent obeys on Fanal work.
// Created by J.Franco. Registers a bundled skill provider on the host skill
// registry, following the @deepseek-ai/dsh-skill-badge provider pattern.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "jfranco-doctrine";
const SKILL_BODY_URL = new URL("../assets/doctrine.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "doctrine",
  description: "The active constitution of the J.Franco house for every Fanal/Trasunto task: the one-sentence test per screen, the zero-CPU rule, the friction honesty (Fanal is the exoskeleton for the heavy day — sell where the numbers say yes, say it when they say no), the wash order (doctrine → data → brain+gates → face → packaging → business), the species verdict (the labor layer, never the system of record), the diminishing-returns rule, and the driver protocol (never poll twice, two failures switch the channel, one heavy operation per turn).",
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
