// @javierfrancoleal/usage-auditor — the self-review layer of the J.Franco
// agentic workflow. Created by J.Franco. Registers the usage-auditor skill
// provider on the host skill registry and, when the host command registry
// is available, the /audit command.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "javierfrancoleal-usage-auditor";
const SKILL_BODY_URL = new URL("../assets/usage-auditor.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "usage-auditor",
  description: "The self-review layer of the J.Franco agentic workflow: audits real-life usage from the supervision, feedback, and usage logs — telemetry, friction points (for example the interpreter not triggering), marketing intelligence, and concrete improvement proposals. The human approves every edit.",
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
const name = "usage-auditor";

/** Service required by the bundled provider. */
const inject = ["skills"];

/** Briefing returned by the /audit command. */
const AUDIT_BRIEFING = [
  "Usage audit ON.",
  "I will read the supervision log, the feedback queue, and the usage data,",
  "then deliver the audit: telemetry, friction points (e.g. the interpreter",
  "not triggering), marketing intelligence, and improvement proposals.",
  "I only propose — you approve every edit.",
].join(" ");

/** Register the bundled skill provider on ctx.skills, and the /audit
 *  command on the host command registry when it resolves. */
function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
  const commands = ctx.get("commands");
  if (commands !== undefined) {
    commands.register({
      // Branded ids are identity strings at runtime; this id names the owner.
      definitionId: "@javierfrancoleal/usage-auditor",
      name: "audit",
      description: "Audit real-life usage: telemetry, friction, marketing intelligence, and improvement proposals",
      input: {
        hint: "[optional: a period, e.g. 'this week']",
        attachments: true,
      },
      handler: () => ({ text: AUDIT_BRIEFING }),
    });
  }
}

export { apply, inject, name };
