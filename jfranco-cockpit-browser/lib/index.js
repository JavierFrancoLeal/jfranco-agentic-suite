// @javierfrancoleal/cockpit-browser — EL NAVEGADOR DE CABINA: the internal
// Claude-Cowork-style browser for DeepSeek Harness's WebContentsView.
// Created by J.Franco. Registers a bundled skill provider on the host skill
// registry, following the @deepseek-ai/dsh-skill provider pattern.
// Zero dependencies, zero eval, security first.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "jfranco-cockpit-browser";
const SKILL_BODY_URL = new URL("../assets/cockpit-browser.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "cockpit-browser",
  description:
    "EL NAVEGADOR DE CABINA: how to configure the Claude-Cowork-style internal browser inside DeepSeek Harness's Electron WebContentsView. The persistent encrypted session (partition persist:fanal-client-workspace, passwords in the SYSTEM Keychain/DPAPI via safeStorage, never in code), the double isolation (the web panel blocks file:// with will-navigate; the documents panel has the internet cancelled with onBeforeRequest allowing only file:///data:), the constitutional brake (the agent fills the fields with executeJavaScript + input/change events and NEVER clicks Envoyer/Soumettre/Payer/Transmettre — it stops before the final button so the human gives the legal click), the 36px HUD (⚡ AGENTE / 🖐️ VOLANTE HUMANO / 🛑 FRENO with the pause button, the +1 single-step debugger, and the automatic physical-mouse detection via before-input-event), and the dual-monitor without data loss (screen display-added/removed moves the live views with removeChildView/addChildView so a half-filled form stays intact). The golden rule: the user commands, the agent assists, and every agent click leaves the emerald border so the human sees what it did.",
  invocation: { modelInvocable: true, userInvocable: true },
  provider: PROVIDER_NAME,
  source: "bundled",
  resourceBase: RESOURCE_BASE,
  rank: BUNDLED_SKILL_RANK,
  locator: SKILL_BODY_URL,
};

const provider = {
  name: PROVIDER_NAME,
  async list() {
    return [CANDIDATE];
  },
  async get() {
    return await readFile(SKILL_BODY_URL, "utf8");
  },
};

export function apply(ctx) {
  ctx.on("skills", (skills) => {
    skills.registerProvider(() => provider);
  });
}

export default apply;
