// @javierfrancoleal/apices — the fiduciary triage for Quebec autonomous
// professionals. Created by J.Franco. DORMANT: published and resting in the
// vestigial genome until the Beta's demand activates it.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "jfranco-apices";
const SKILL_BODY_URL = new URL("../assets/apices.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "apices",
  description: "The fiduciary triage when preparing a dossier for a Quebec autonomous professional (CPA, avocat, notaire, courtier OACIQ/ChAD, clinicien CNESST/SAAQ, CRIC, RBQ) or a micro-business owner (gym OPC, plex TAL, RSGE, RPA, CITQ, OBNL): the four universal responsibility triggers, the literal sourcePin (never paraphrase a judicial or accounting citation — verify with includes() against the original), the max-5 apices rule, and the signature that stays locked until every apex is touched. Never says 'Fanal certifie' — always 'points prepared for the professional's verification and signature'.",
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
