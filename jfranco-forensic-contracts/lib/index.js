// @javierfrancoleal/forensic-contracts — the discipline for every critical
// function. Created by J.Franco. DORMANT until the beta's audit demand.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "jfranco-forensic-contracts";
const SKILL_BODY_URL = new URL("../assets/forensic-contracts.md", import.meta.url);
const RESOURCE_BASE = { kind: "directory", path: fileURLToPath(new URL("../assets/", import.meta.url)) };

const CANDIDATE = {
  name: "forensic-contracts",
  description: "The forensic-contract discipline for the Fanal codebase: every critical function is born with the 5-line @fanal-forensic-contract header (the id, the origin, the invariant, the blast radius, the golden test), the scanner (tools/forensic-code-auditor.js) runs before every commit, and the architecture follows the 7-file deterministic-cage doctrine (the LLM exists ONLY in the brain router; everything leaving it passes the deterministic validators). For the future forensic engineer: the code must explain itself.",
  invocation: { modelInvocable: true, userInvocable: true },
  provider: PROVIDER_NAME,
  source: "bundled",
  resourceBase: RESOURCE_BASE,
  rank: BUNDLED_SKILL_RANK,
  locator: SKILL_BODY_URL,
};

const provider = { name: PROVIDER_NAME, async list() { return [CANDIDATE]; }, async get() { return await readFile(SKILL_BODY_URL, "utf8"); } };

export function apply(ctx) {
  ctx.on("skills", (skills) => { skills.registerProvider(() => provider); });
}
export default apply;
