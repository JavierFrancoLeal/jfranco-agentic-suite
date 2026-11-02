// @javierfrancoleal/interpreter — real-time translation and interpretation layer of
// the J.Franco agentic workflow. Created by J.Franco. Registers the
// interpreter skill provider on the host skill registry and, when the host
// command registry is available, the /interpret command.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "jfranco-interpreter";
const SKILL_BODY_URL = new URL("../assets/interpreter.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "interpreter",
  description: "Real-time translation and interpretation for conversations in different languages: detect each speaker's language, interpret both directions faithfully, and give the human short speakable phrases — in listening and advisory modes of the J.Franco agentic workflow.",
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
const name = "interpreter";

/** Service required by the bundled provider. */
const inject = ["skills"];

/** Briefing returned by the /interpret command. */
const INTERPRET_BRIEFING = [
  "Interpretation mode ON.",
  "Tell me the conversation or paste the text, in any language.",
  "I will detect the languages, interpret both directions faithfully, and",
  "give you short speakable phrases in the other person's language.",
  'Say "that\'s all" when you are done.',
].join(" ");

/** Register the bundled skill provider on ctx.skills, and the /interpret
 *  command on the host command registry when it resolves. */
function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
  const commands = ctx.get("commands");
  if (commands !== undefined) {
    commands.register({
      // Branded ids are identity strings at runtime; this id names the owner.
      definitionId: "@javierfrancoleal/interpreter",
      name: "interpret",
      description: "Start interpretation mode: translate and interpret a conversation in real time",
      input: {
        hint: "[the conversation or text, in any language]",
        attachments: true,
      },
      handler: () => ({ text: INTERPRET_BRIEFING }),
    });
  }
}

export { apply, inject, name };
