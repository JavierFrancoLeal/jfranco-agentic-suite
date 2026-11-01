// @jfranco/workflow-master — trigger layer ("listening mode") of the J.Franco
// agentic workflow. Created by J.Franco. Registers the workflow-master skill
// provider on the host skill registry and, when the host command registry is
// available, the /listen command that starts listening mode.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "jfranco-workflow-master";
const SKILL_BODY_URL = new URL("../assets/workflow-master.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "workflow-master",
  description: "The trigger layer of the J.Franco agentic workflow: listening mode. Wake it with /listen, \"listen\", \"escucha\", or \"DSH, escucha\", or by relaying a conversation — then it captures everything, identifies who is asking, splits the conversation into discrete actions, and develops the workflow: automatic GREEN actions, semi-automatic flagged actions, YELLOW proposals waiting for the human, RED questions. Includes live advisory mode for earpiece use.",
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
const name = "workflow-master";

/** Service required by the bundled provider. */
const inject = ["skills"];

/** Briefing returned by the /listen command: starts listening mode. */
const LISTEN_BRIEFING = [
  "Listening mode ON — go ahead.",
  "Tell me the conversation or the requests. I will capture everything,",
  "identify who is asking, split it into actions, and build the workflow",
  "(automatic actions, proposals for your authorization, and questions).",
  'Say "that\'s all" when you are done.',
].join(" ");

/** Register the bundled skill provider on ctx.skills, and the /listen
 *  command on the host command registry when it resolves. */
function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
  const commands = ctx.get("commands");
  if (commands !== undefined) {
    commands.register({
      // Branded ids are identity strings at runtime; this id names the owner.
      definitionId: "@jfranco/workflow-master",
      name: "listen",
      description: "Start listening mode: capture a conversation or requests and build the workflow",
      input: {
        hint: "[anything you want to tell me, or just start talking]",
        attachments: true,
      },
      handler: () => ({ text: LISTEN_BRIEFING }),
    });
  }
}

export { apply, inject, name };
