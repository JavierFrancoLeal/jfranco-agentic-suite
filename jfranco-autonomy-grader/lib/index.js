// @javierfrancoleal/autonomy-grader — governance layer of the J.Franco agentic
// workflow. Created by J.Franco. Registers the autonomy-grader skill provider
// on the host skill registry and, when the host command registry is
// available, the /grade command.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "jfranco-autonomy-grader";
const SKILL_BODY_URL = new URL("../assets/autonomy-grader.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "autonomy-grader",
  description: "The governance layer of the J.Franco agentic workflow: grades the reliability of automatic decisions (A/B/C/D) from the supervision log, proposes tier moves for decisions.md, and computes the overall autonomy level 1-5. The human approves every change.",
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
const name = "autonomy-grader";

/** Service required by the bundled provider. */
const inject = ["skills"];

/** Briefing returned by the /grade command. */
const GRADE_BRIEFING = [
  "Autonomy grading ON.",
  "I will read the supervision log, grade every automatic action pattern",
  "(A/B/C/D), and propose tier moves for decisions.md.",
  "I only propose — you approve every change.",
].join(" ");

/** Briefing returned by the /summary command. */
const SUMMARY_BRIEFING = [
  "Management Summary ON.",
  "I will read the supervision log and produce the one-page report: totals,",
  "per-worker table, sector KPIs, and the top three improvements.",
  "Plain language, ready for the owner.",
].join(" ");

/** Register the bundled skill provider on ctx.skills, and the /grade and
 *  /summary commands on the host command registry when it resolves. */
function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
  const commands = ctx.get("commands");
  if (commands !== undefined) {
    commands.register({
      // Branded ids are identity strings at runtime; this id names the owner.
      definitionId: "@javierfrancoleal/autonomy-grader",
      name: "grade",
      description: "Grade the reliability of automatic decisions and propose tier moves",
      input: {
        hint: "[optional: a specific pattern or domain to grade]",
        attachments: true,
      },
      handler: () => ({ text: GRADE_BRIEFING }),
    });
    commands.register({
      definitionId: "@javierfrancoleal/autonomy-grader",
      name: "summary",
      description: "One-page management summary for the owner: totals, per-worker table, KPIs, suggestions",
      input: {
        hint: "[optional: a period, e.g. 'this week']",
        attachments: true,
      },
      handler: () => ({ text: SUMMARY_BRIEFING }),
    });
  }
}

export { apply, inject, name };
