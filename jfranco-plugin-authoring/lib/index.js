// @javierfrancoleal/plugin-authoring — host half.
// Registers the `plugin-authoring` skill so agents can load the distilled
// guide for building DeepSeek Harness plugins without re-discovering the
// architecture. The skill body lives in assets/plugin-authoring.md.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "javierfrancoleal-plugin-authoring";
const SKILL_BODY_URL = new URL("../assets/plugin-authoring.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "plugin-authoring",
  description: "Build and publish a DeepSeek Harness plugin (host-only, client-only, or dual-face) without re-discovering the architecture: package.json anatomy, cordis.patch.yml, the browser-half recipe (dsh.client + window.__ModuleLoader__ + slots), locale, theme tokens, install steps, gotchas, and the validation checklist. Load before creating or extending any DSH plugin.",
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

const name = "plugin-authoring";
const inject = ["skills"];

function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
}

export { apply, inject, name };
