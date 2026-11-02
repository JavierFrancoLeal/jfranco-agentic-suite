// @javierfrancoleal/audit — the consolidation organ of the J.Franco
// agentic workflow. Created by J.Franco. Folded from the vestigial
// usage-auditor and triage organs. Registers the audit skill provider and,
// when the host command registry is available, the /audit command.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "javierfrancoleal-audit";
const SKILL_BODY_URL = new URL("../assets/audit.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "audit",
  description: "The consolidation organ of the J.Franco agentic workflow: one pass over the logs produces telemetry, friction points, marketing intelligence, the triage review, and the grade summary. The human approves every edit.",
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

const name = "audit";
const inject = ["skills"];

const AUDIT_BRIEFING = [
  "Audit ON — the consolidation organ.",
  "One pass over the logs: telemetry, friction, marketing intelligence,",
  "triage review, and grade summary.",
  "I only propose — you approve every edit.",
].join(" ");

function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
  const commands = ctx.get("commands");
  if (commands !== undefined) {
    commands.register({
      definitionId: "@javierfrancoleal/audit",
      name: "audit",
      description: "One consolidation pass: telemetry, friction, marketing, triage review, grade summary",
      input: { hint: "[optional: a period, e.g. 'this week']", attachments: true },
      handler: () => ({ text: AUDIT_BRIEFING }),
    });
  }
}

export { apply, inject, name };
