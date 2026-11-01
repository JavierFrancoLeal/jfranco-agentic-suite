// @jfranco/decision-router — agentic-workflow stage 2: tiered decisions.
// Created by J.Franco. Registers a bundled skill provider on the host skill
// registry, following the @deepseek-ai/dsh-skill-badge provider pattern.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "jfranco-decision-router";
const SKILL_BODY_URL = new URL("../assets/decision-router.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "decision-router",
  description: "The agent processes and proposes; the human decides. Automatic GREEN actions are logged for verification; safety-critical ones run semi-automatically with a mandatory verification flag; everything irreversible or needing accountability is a YELLOW proposal that waits for the human. Long work runs under an agreed mission scope. Consult the user's decisions.md policy file and keep an audit trail. Stage 2 of the J.Franco agentic workflow.",
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
const name = "decision-router";

/** Service required by the bundled provider. */
const inject = ["skills"];

/** Register the bundled skill provider on ctx.skills. */
function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
}

export { apply, inject, name };
