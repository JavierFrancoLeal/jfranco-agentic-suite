// @javierfrancoleal/triage — the creator's issue-triage layer of the
// J.Franco agentic workflow. Created by J.Franco. Registers the triage
// skill provider and, when the host command registry is available, the
// /triage command.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "javierfrancoleal-triage";
const SKILL_BODY_URL = new URL("../assets/triage.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "triage",
  description: "The creator's issue-triage layer of the J.Franco agentic workflow: classify every bug as ESSENTIAL (blocks the core flow — fix now) or NON-ESSENTIAL (cosmetic/animation — accepted in Beta, field-tested by a small supervised group). The creator makes the distinction; the essential flow never stops.",
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

const name = "triage";
const inject = ["skills"];

const TRIAGE_BRIEFING = [
  "Issue triage ON.",
  "ESSENTIAL bugs (login, listen, summary, confirm, orders, telemetry) are fixed now.",
  "NON-ESSENTIAL bugs (cosmetic, animation, polish) are recorded in triage.md,",
  "accepted for Beta, and do not block the flow.",
  "Only the creator moves an issue between classes.",
].join(" ");

function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
  const commands = ctx.get("commands");
  if (commands !== undefined) {
    commands.register({
      definitionId: "@javierfrancoleal/triage",
      name: "triage",
      description: "Classify an issue: essential (fix now) or non-essential (record and accept in Beta). The creator decides.",
      input: {
        hint: "[describe the bug]",
        attachments: true,
      },
      handler: () => ({ text: TRIAGE_BRIEFING }),
    });
  }
}

export { apply, inject, name };
