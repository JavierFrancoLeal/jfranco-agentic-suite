// @jfranco/accountability-auditor — agentic-workflow stage 3: reflection and
// verification. Created by J.Franco. Registers a bundled skill provider on the
// host skill registry, following the @deepseek-ai/dsh-skill-badge provider pattern.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "jfranco-accountability-auditor";
const SKILL_BODY_URL = new URL("../assets/accountability-auditor.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "accountability-auditor",
  description: "Mandatory reflection and verification pass before any output is final: audit the input trail, decision trail, and actions, then hand the human a compact Accountability Report separating the automatic actions to verify from the proposals to decide. Stage 3 of the J.Franco agentic workflow.",
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

/** Cordis plugin name. */
const name = "accountability-auditor";

/** Service required by the bundled provider. */
const inject = ["skills"];

/** Register the bundled skill provider on ctx.skills. */
function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
}

export { apply, inject, name };
