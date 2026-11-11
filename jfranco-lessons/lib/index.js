// @javierfrancoleal/lessons — the learning organ of the J.Franco house.
// The GENOME: the active lessons that prevent the past from repeating.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "jfranco-lessons";
const SKILL_BODY_URL = new URL("../assets/lessons.md", import.meta.url);
const RESOURCE_BASE = { kind: "directory", path: fileURLToPath(new URL("../assets/", import.meta.url)) };

const CANDIDATE = {
  name: "lessons",
  description: "The learning organ of the house (the genome that remembers): before shipping any artifact, LAUNCH it for real (the package is not the flight — the asar check is not a launch test); before launching an Electron app from a shell, check the environment (ELECTRON_RUN_AS_NODE=1 runs NODE without a window); patch quoted strings with the direct edit, never the heredoc; and every failure becomes a numbered lesson in the KNOWLEDGE-LEDGER plus a guard — a failure that can happen twice was not understood once.",
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
