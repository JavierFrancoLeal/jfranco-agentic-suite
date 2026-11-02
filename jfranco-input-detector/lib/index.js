// @javierfrancoleal/input-detector — agentic-workflow stage 1: input detection.
// Created by J.Franco. Registers a bundled skill provider on the host skill
// registry, following the @deepseek-ai/dsh-skill-badge provider pattern.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "jfranco-input-detector";
const SKILL_BODY_URL = new URL("../assets/input-detector.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "input-detector",
  description: "Detect, classify, and route every input before acting — splitting multi-request conversations into discrete actions and recognizing sensor or device triggers (voice-stress alerts, facial-cue alerts, camera reads) — whether the input comes from the user, a third party, or a device. Mandatory first stage of the J.Franco agentic workflow: question, task, trigger, review, or workflow.",
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
const name = "input-detector";

/** Service required by the bundled provider. */
const inject = ["skills"];

/** Register the bundled skill provider on ctx.skills. */
function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
}

export { apply, inject, name };
