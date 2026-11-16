(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("node:crypto"));
  } else {
    root.FanalSetupValidator = factory(null);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (cryptoMod) {
  "use strict";

  const PASSWORD_RULES_SPEC = Object.freeze({
    minLength: 12,
    maxLength: 128,
    rules: Object.freeze([
      Object.freeze({ id: "minLength", labelKey: "pwRuleMinLen" }),
      Object.freeze({ id: "uppercase", labelKey: "pwRuleUpper" }),
      Object.freeze({ id: "lowercase", labelKey: "pwRuleLower" }),
      Object.freeze({ id: "digit", labelKey: "pwRuleDigit" }),
      Object.freeze({ id: "special", labelKey: "pwRuleSpecial" }),
      Object.freeze({ id: "notUserOrCommon", labelKey: "pwRuleNoWeak" }),
    ]),
  });

  const COMMON_WEAK_TOKENS = Object.freeze([
    "password",
    "motdepasse",
    "contrasena",
    "contraseña",
    "passwort",
    "qwerty",
    "azerty",
    "123456",
    "12345678",
    "123456789",
    "letmein",
    "welcome",
    "changeme",
    "default",
    "fanal2026",
    "trasunto",
    "administrator",
    "admin123",
  ]);

  const RESERVED_USERNAMES = new Set([
    "admin",
    "administrator",
    "root",
    "system",
    "sysadmin",
    "superuser",
    "null",
    "undefined",
    "anonymous",
    "guest",
    "support",
    "api",
    "bot",
    "fanal",
    "trasunto",
  ]);

  const ALLOWED_SCALES = new Set([
    "AUTONOMOUS_SOLO",
    "MICRO_SINGLE_OWNER",
    "SME_CELL",
  ]);

  const CLOSED_TAX_REGIMES = new Set([
    "PETIT_FOURNISSEUR_EXEMPT",
    "INSCRIT_TPS_TVQ",
  ]);

  const CLOSED_TONE_REGISTERS = new Set([
    "VOUVOIEMENT_CHALEUREUX",
    "TUTOIEMENT_PROCHE",
    "FORMEL_FIDUCIAIRE",
  ]);

  const CLOSED_DISCOUNT_POLICIES = Object.freeze({
    LOCKED_0_PCT: 0,
    TIERED_MAX_5_PCT: 5,
    TIERED_MAX_10_PCT: 10,
  });

  const DSH_IMMUTABLE_LAWS = Object.freeze([
    Object.freeze({
      id: "LAW_01_NO_FABRICATION",
      principle: "Nunca inventar datos, tarifas, lois ou dossiers — tout élément non vérifié déclenche un arrêt ROUGE.",
    }),
    Object.freeze({
      id: "LAW_02_FLOOR_AND_SIGNATURE",
      principle: "Le plancher économique (pricingFloorCad) et tout écart hors grille exigent une signature humaine explicite.",
    }),
    Object.freeze({
      id: "LAW_03_LOI25_LOCAL_VAULT",
      principle: "Souveraineté & Voile Loi 25 : aucune PII ou clé secrète ne quitte le coffre local sans expurgation vérifiée.",
    }),
  ]);

  const SELECTABLE_RED_ESCALATIONS = Object.freeze([
    "RED_PROMISE_DEADLINE",
    "RED_REFUND_OVER_FLOOR",
    "RED_LEGAL_MEDICAL_OPINION",
    "RED_EXTERNAL_COMMITMENT",
  ]);

  const SELECTABLE_ESCALATION_SET = new Set(SELECTABLE_RED_ESCALATIONS);

  function normalizeScaleKey(raw) {
    const k = String(raw || "").trim().toUpperCase();
    if (k === "LARGE_ENTERPRISE_CELL" || k === "COMPANY" || k === "TEAM") return "SME_CELL";
    if (k === "MICRO" || k === "MICRO_SINGLE_OWNER") return "MICRO_SINGLE_OWNER";
    if (k === "SOLO" || k === "AUTONOMOUS_SOLO") return "AUTONOMOUS_SOLO";
    return ALLOWED_SCALES.has(k) ? k : "";
  }

  function validateUsername(rawName, existingUsersMap) {
    const trimmed = String(rawName || "").trim();
    if (trimmed.length < 2 || trimmed.length > 48) {
      return { valid: false, status: 400, code: "ERR_USER_LENGTH", normalized: trimmed };
    }
    if (/[<>\"';/\\`]|[\x00-\x1f\x7f]/.test(trimmed) || /\s{2,}/.test(trimmed)) {
      return { valid: false, status: 400, code: "ERR_USER_FORMAT", normalized: trimmed };
    }
    if (!/^[\p{L}\p{N}][\p{L}\p{N}._ -]{0,46}[\p{L}\p{N}]$/u.test(trimmed)) {
      return { valid: false, status: 400, code: "ERR_USER_FORMAT", normalized: trimmed };
    }
    const lower = trimmed.toLowerCase();
    if (RESERVED_USERNAMES.has(lower)) {
      return { valid: false, status: 400, code: "ERR_USER_RESERVED", normalized: trimmed };
    }
    const existingKeys = Object.keys(existingUsersMap || {});
    for (let i = 0; i < existingKeys.length; i += 1) {
      if (String(existingKeys[i]).trim().toLowerCase() === lower) {
        return { valid: false, status: 409, code: "ERR_USER_EXISTS", normalized: trimmed };
      }
    }
    return { valid: true, status: 200, code: "OK", normalized: trimmed };
  }

  function evaluatePasswordPolicy(rawPassword, username) {
    const pw = typeof rawPassword === "string" ? rawPassword : "";
    const lowerPw = pw.toLowerCase();
    const trimmedUser = String(username || "").trim().toLowerCase();

    const hasLength = pw.length >= PASSWORD_RULES_SPEC.minLength && pw.length <= PASSWORD_RULES_SPEC.maxLength;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasDigit = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9\s]/.test(pw);

    let notWeak = pw.length > 0 && !/(.)\1{4,}/.test(pw) && !/^\s+$/.test(pw);
    if (notWeak && trimmedUser.length >= 3 && lowerPw.includes(trimmedUser)) {
      notWeak = false;
    }
    if (notWeak) {
      for (let i = 0; i < COMMON_WEAK_TOKENS.length; i += 1) {
        if (lowerPw.includes(COMMON_WEAK_TOKENS[i])) {
          notWeak = false;
          break;
        }
      }
    }

    const criteria = {
      minLength: hasLength,
      uppercase: hasUpper,
      lowercase: hasLower,
      digit: hasDigit,
      special: hasSpecial,
      notUserOrCommon: notWeak,
    };

    const errors = [];
    if (!criteria.minLength) errors.push("ERR_PW_MIN_LENGTH");
    if (!criteria.uppercase) errors.push("ERR_PW_UPPERCASE");
    if (!criteria.lowercase) errors.push("ERR_PW_LOWERCASE");
    if (!criteria.digit) errors.push("ERR_PW_DIGIT");
    if (!criteria.special) errors.push("ERR_PW_SPECIAL");
    if (!criteria.notUserOrCommon) errors.push("ERR_PW_WEAK_OR_CONTAINS_USER");

    const passedCount = Object.values(criteria).filter(Boolean).length;
    const strength = !pw ? "empty" : (passedCount === 6 ? "strong" : (passedCount >= 4 ? "fair" : "weak"));

    return {
      valid: errors.length === 0,
      passedCount,
      totalCount: 6,
      strength,
      criteria,
      errors,
    };
  }

  function cleanFiscalId(raw) {
    return String(raw || "").replace(/[\s-]+/g, "").toUpperCase();
  }

  function validateQuebecFiscalNumbers(input) {
    const errors = [];
    const neq = cleanFiscalId(input && input.neq);
    const tpsNumber = cleanFiscalId(input && input.tpsNumber);
    const tvqNumber = cleanFiscalId(input && input.tvqNumber);
    const rawRegime = String((input && input.taxRegime) || "").trim().toUpperCase();
    const taxRegime = CLOSED_TAX_REGIMES.has(rawRegime) ? rawRegime : "";

    if (!taxRegime) {
      errors.push("ERR_TAX_REGIME_REQUIRED");
    }
    if (neq && !/^(11|22|33|88)\d{8}$/.test(neq)) {
      errors.push("ERR_NEQ_INVALID");
    }
    if (tpsNumber && !/^\d{9}RT\d{4}$/.test(tpsNumber)) {
      errors.push("ERR_TPS_INVALID");
    }
    if (tvqNumber && !/^\d{10}TQ\d{4}$/.test(tvqNumber)) {
      errors.push("ERR_TVQ_INVALID");
    }
    if (taxRegime === "INSCRIT_TPS_TVQ") {
      if (!tpsNumber) errors.push("ERR_TPS_REQUIRED_FOR_REGIME");
      if (!tvqNumber) errors.push("ERR_TVQ_REQUIRED_FOR_REGIME");
    }

    return {
      valid: errors.length === 0,
      errors,
      normalized: { neq, tpsNumber, tvqNumber, taxRegime },
    };
  }

  function normalizeClosedEscalations(rawList) {
    const arr = Array.isArray(rawList) ? rawList : [];
    const out = [];
    const seen = new Set();
    for (let i = 0; i < arr.length; i += 1) {
      const k = String(arr[i] || "").trim().toUpperCase();
      if (SELECTABLE_ESCALATION_SET.has(k) && !seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
    return out;
  }

  function isValidBasicEmail(raw) {
    const v = String(raw || "").trim();
    return v.length >= 5 && v.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  function extractConstitutionPayload(body) {
    const c = (body && typeof body.constitution === "object" && body.constitution) ? body.constitution : (body || {});
    return {
      bizName: String(c.bizName ?? body?.bizName ?? "").trim(),
      taxRegime: String(c.taxRegime ?? body?.taxRegime ?? "").trim().toUpperCase(),
      neq: String(c.neq ?? body?.neq ?? "").trim(),
      tpsNumber: String(c.tpsNumber ?? body?.tpsNumber ?? "").trim(),
      tvqNumber: String(c.tvqNumber ?? body?.tvqNumber ?? "").trim(),
      rprpName: String(c.rprpName ?? body?.rprpName ?? "").trim(),
      rprpEmail: String(c.rprpEmail ?? body?.rprpEmail ?? "").trim(),
      toneRegister: String(c.toneRegister ?? body?.toneRegister ?? "").trim().toUpperCase(),
      pricingFloorCad: Number(c.pricingFloorCad ?? body?.pricingFloorCad),
      discountPolicy: String(c.discountPolicy ?? body?.discountPolicy ?? "").trim().toUpperCase(),
      escalationRules: normalizeClosedEscalations(c.escalationRules ?? body?.escalationRules),
      signerInitials: String(c.signerInitials ?? body?.signerInitials ?? "").trim().toUpperCase(),
    };
  }

  function validateClosedConstitutionFields(rawInput, scaleType) {
    const c = extractConstitutionPayload(rawInput);
    const errors = [];
    if (c.bizName.length < 2 || c.bizName.length > 120) errors.push("ERR_CONSTITUTION_BIZ_NAME");
    if (c.rprpName.length < 2 || c.rprpName.length > 120) errors.push("ERR_CONSTITUTION_RPRP_NAME");
    if (!isValidBasicEmail(c.rprpEmail)) errors.push("ERR_CONSTITUTION_RPRP_EMAIL");
    if (!CLOSED_TONE_REGISTERS.has(c.toneRegister)) errors.push("ERR_CONSTITUTION_TONE");
    if (!Number.isFinite(c.pricingFloorCad) || c.pricingFloorCad <= 0 || c.pricingFloorCad > 1000000) {
      errors.push("ERR_CONSTITUTION_PRICING_FLOOR");
    }
    if (!Object.prototype.hasOwnProperty.call(CLOSED_DISCOUNT_POLICIES, c.discountPolicy)) {
      errors.push("ERR_CONSTITUTION_DISCOUNT_POLICY");
    }
    if (!c.escalationRules || c.escalationRules.length < 1) {
      errors.push("ERR_CONSTITUTION_ESCALATIONS");
    }
    if (!/^[A-Z0-9.\- ]{2,16}$/.test(c.signerInitials)) {
      errors.push("ERR_CONSTITUTION_SIGNER_INITIALS");
    }

    const tax = validateQuebecFiscalNumbers({
      neq: c.neq,
      tpsNumber: c.tpsNumber,
      tvqNumber: c.tvqNumber,
      taxRegime: c.taxRegime,
      scaleType,
    });
    for (let i = 0; i < tax.errors.length; i += 1) errors.push(tax.errors[i]);

    return {
      valid: errors.length === 0,
      errors,
      normalized: {
        ...c,
        neq: tax.normalized.neq,
        tpsNumber: tax.normalized.tpsNumber,
        tvqNumber: tax.normalized.tvqNumber,
        taxRegime: tax.normalized.taxRegime,
        pricingFloorCad: Number.isFinite(c.pricingFloorCad) ? Math.round(c.pricingFloorCad * 100) / 100 : 0,
        maxAutoDiscountPct: CLOSED_DISCOUNT_POLICIES[c.discountPolicy] ?? 0,
      },
    };
  }

  function validateSetupPayload(body, existingUsersMap, catalog) {
    const b = body && typeof body === "object" ? body : {};
    const errors = [];

    const userRes = validateUsername(b.user, existingUsersMap);
    if (!userRes.valid) errors.push(userRes.code);

    const pwRaw = typeof b.password === "string" ? b.password : "";
    const pwRes = evaluatePasswordPolicy(pwRaw, userRes.normalized);
    if (!pwRes.valid) {
      for (let i = 0; i < pwRes.errors.length; i += 1) errors.push(pwRes.errors[i]);
    }
    if (b.passwordConfirm !== undefined && String(b.passwordConfirm) !== pwRaw) {
      errors.push("ERR_PW_CONFIRM_MISMATCH");
    }

    const scaleType = normalizeScaleKey(b.scaleType);
    if (!scaleType) errors.push("ERR_SCALE_REQUIRED");

    let rawSec = String(b.sector || "").trim();
    let reqProf = String(b.professionKey || "").trim().toUpperCase();
    if (rawSec.startsWith("prof:")) {
      reqProf = rawSec.slice(5).trim().toUpperCase();
      rawSec = "";
    }

    const knownProfKeys = catalog && Array.isArray(catalog.soloProfessionKeys) ? new Set(catalog.soloProfessionKeys) : null;
    const knownSectorIds = catalog && Array.isArray(catalog.sectorIds) ? new Set(catalog.sectorIds) : null;

    if (scaleType === "AUTONOMOUS_SOLO") {
      if (!reqProf) {
        errors.push("ERR_PROFESSION_REQUIRED");
      } else if (knownProfKeys && reqProf !== "AUTRE_AUTONOME" && !knownProfKeys.has(reqProf)) {
        errors.push("ERR_PROFESSION_UNKNOWN");
      }
    } else if (scaleType) {
      if (!rawSec || rawSec === "prof:") {
        errors.push("ERR_SECTOR_REQUIRED");
      } else if (knownSectorIds && !knownSectorIds.has(rawSec)) {
        errors.push("ERR_SECTOR_UNKNOWN");
      }
    }

    const conRes = validateClosedConstitutionFields(b, scaleType);
    if (!conRes.valid) {
      for (let i = 0; i < conRes.errors.length; i += 1) errors.push(conRes.errors[i]);
    }

    const staffRaw = Number(b.staffCount);
    const defaultStaff = scaleType === "AUTONOMOUS_SOLO" ? 1 : (scaleType === "MICRO_SINGLE_OWNER" ? 3 : 8);
    const staffCount = Number.isFinite(staffRaw) && staffRaw >= 1
      ? (scaleType === "AUTONOMOUS_SOLO" ? 1 : Math.round(staffRaw))
      : defaultStaff;

    return {
      valid: errors.length === 0,
      status: userRes.status === 409 ? 409 : (errors.length === 0 ? 200 : 400),
      errors,
      passwordAudit: pwRes,
      constitutionAudit: conRes,
      normalized: {
        user: userRes.normalized,
        password: pwRaw,
        scaleType,
        staffCount,
        sector: rawSec,
        professionKey: reqProf,
        constitution: conRes.normalized,
      },
    };
  }

  function evaluateSetupReadiness(state) {
    const s = state && typeof state === "object" ? state : {};
    const langOk = typeof s.lang === "string" && s.lang.trim().length >= 2;

    const scaleType = normalizeScaleKey(s.scaleType);
    const structureOk = scaleType === "AUTONOMOUS_SOLO"
      ? Boolean(String(s.professionKey || "").trim())
      : Boolean(scaleType && String(s.sector || "").trim());

    const conCheck = validateClosedConstitutionFields(s, scaleType);
    const userCheck = validateUsername(s.user, s.existingUsersMap || {});
    const pwCheck = evaluatePasswordPolicy(s.password, userCheck.normalized);
    const confirmOk = Boolean(s.password) && String(s.passwordConfirm ?? "") === String(s.password ?? "");
    const credentialsOk = userCheck.valid && pwCheck.valid && confirmOk;

    const byokConfigured = Boolean(s.hasByokKey);

    const items = [
      { id: "lang", required: true, done: langOk },
      { id: "structure", required: true, done: structureOk },
      { id: "constitution", required: true, done: conCheck.valid, missingCodes: conCheck.errors },
      { id: "credentials", required: true, done: credentialsOk, userCode: userCheck.code, pwAudit: pwCheck, confirmOk },
      { id: "byok", required: false, done: byokConfigured, optional: true },
    ];

    const requiredCount = 4;
    const completedRequiredCount = items.slice(0, 4).filter((it) => it.done).length;

    return {
      ready: completedRequiredCount === requiredCount,
      requiredCount,
      completedRequiredCount,
      items,
      passwordAudit: pwCheck,
      usernameAudit: userCheck,
      constitutionAudit: conCheck,
    };
  }

  function sha256Hex(str) {
    if (!cryptoMod) return "";
    return cryptoMod.createHash("sha256").update(String(str), "utf8").digest("hex");
  }

  function buildClosedConstitutionDocument(normalized, defaults, extra) {
    const opts = extra && typeof extra === "object" ? extra : {};
    const c = normalized.constitution;
    const def = defaults || {};
    const secId = def.sectorId || normalized.sector || (normalized.scaleType === "AUTONOMOUS_SOLO" ? "solo" : "generic");
    const profKey = def.professionKey !== undefined ? def.professionKey : normalized.professionKey;
    const materialityCad = Number(def.defaultMaterialityCad || c.pricingFloorCad || 500);
    const isSoloMode = normalized.scaleType === "AUTONOMOUS_SOLO" || (normalized.scaleType === "MICRO_SINGLE_OWNER" && normalized.staffCount <= 1);
    const nowIso = opts.nowIso || new Date().toISOString();

    const legalIdentity = {
      businessName: c.bizName,
      neq: c.neq,
      tpsNumber: c.tpsNumber,
      tvqNumber: c.tvqNumber,
      taxRegime: c.taxRegime,
      sector: secId,
      professionKey: profKey,
      businessScaleType: normalized.scaleType,
      loi25Rprp: { name: c.rprpName, email: c.rprpEmail },
    };

    const economicInvariants = {
      pricingFloorCad: c.pricingFloorCad,
      materialityThresholdCad: materialityCad,
      discountPolicy: c.discountPolicy,
      maxAutoDiscountPct: c.maxAutoDiscountPct,
    };

    const operationalCharter = {
      closedCharterVersion: "FANAL-CONSTITUTION-V2",
      toneRegister: c.toneRegister,
      mandatoryEscalations: c.escalationRules,
      immutableLawsCount: DSH_IMMUTABLE_LAWS.length,
    };

    const genesisSeed = JSON.stringify({ legalIdentity, economicInvariants, operationalCharter, dshLaws: DSH_IMMUTABLE_LAWS.map((l) => l.id) });
    const sharedGenesisHash = sha256Hex(genesisSeed).slice(0, 16) || "0000000000000000";

    return {
      schemaVersion: "FANAL-CONSTITUTION-V2",
      createdAtIso: nowIso,
      updatedAt: nowIso,
      setupVerifiedAtIso: nowIso,
      scaleType: normalized.scaleType,
      staffCount: normalized.staffCount,
      sector: secId,
      professionKey: profKey,
      bizName: c.bizName,
      taxRegime: c.taxRegime,
      rprpName: c.rprpName,
      rprpEmail: c.rprpEmail,
      toneRegister: c.toneRegister,
      pricingFloorCad: c.pricingFloorCad,
      materialityThresholdCad: materialityCad,
      discountPolicy: c.discountPolicy,
      maxAutoDiscountPct: c.maxAutoDiscountPct,
      escalationRules: c.escalationRules,
      signerInitials: c.signerInitials,
      dshImmutableLaws: DSH_IMMUTABLE_LAWS,
      legalIdentity,
      economicInvariants,
      operationalCharter,
      topologyAndAccess: {
        topologyMode: isSoloMode ? "SOLO" : "CELL",
        staffCount: normalized.staffCount,
      },
      coResponsibilityPact: {
        clientAttestation: `Titulaire / RPRP (${c.signerInitials}) certifie l'exactitude des invariants économiques, du régime fiscal et du registre Loi 25.`,
        clientSignedWithInitials: c.signerInitials,
        sharedGenesisHash,
      },
      setupMandatoryPassed: true,
    };
  }

  function buildInstallationAttestation({ edition, appVersion, constitution, nodeIdentity }) {
    if (!cryptoMod) throw new Error("Node crypto required for buildInstallationAttestation");
    if (!constitution || !nodeIdentity || !nodeIdentity.signPrivatePem || !nodeIdentity.signPublicB64) {
      throw new Error("Constitution and Ed25519 identity required");
    }

    const issuedAtIso = new Date().toISOString();
    const legal = constitution.legalIdentity || {};
    const econ = constitution.economicInvariants || {};
    const charter = constitution.operationalCharter || {};
    const topo = constitution.topologyAndAccess || {};
    const pact = constitution.coResponsibilityPact || {};
    const rprp = legal.loi25Rprp || {};

    const installationProfile = {
      scaleType: constitution.scaleType || legal.businessScaleType || "",
      topologyMode: topo.topologyMode || "SOLO",
      sector: constitution.sector || legal.sector || "generic",
      professionKey: constitution.professionKey || legal.professionKey || "",
      taxRegime: constitution.taxRegime || legal.taxRegime || "",
      toneRegister: constitution.toneRegister || charter.toneRegister || "",
      discountPolicy: econ.discountPolicy || constitution.discountPolicy || "LOCKED_0_PCT",
      pricingFloorCad: Number(econ.pricingFloorCad ?? constitution.pricingFloorCad ?? 0),
      materialityThresholdCad: Number(econ.materialityThresholdCad ?? constitution.materialityThresholdCad ?? 0),
      escalationCount: Array.isArray(constitution.escalationRules) ? constitution.escalationRules.length : 0,
      dshLawsCount: Array.isArray(constitution.dshImmutableLaws) ? constitution.dshImmutableLaws.length : 0,
      loi25RprpConfigured: Boolean(rprp.name && rprp.email && String(rprp.email).includes("@")),
      neqPresent: Boolean(legal.neq),
      tpsTvqRegistered: Boolean(legal.tpsNumber && legal.tvqNumber),
      setupMandatoryPassed: Boolean(constitution.setupMandatoryPassed && pact.clientSignedWithInitials),
    };

    const constitutionSha256 = sha256Hex(JSON.stringify(constitution));
    const profileSha256 = sha256Hex(JSON.stringify(installationProfile));

    const unsignedPayload = {
      schemaVersion: "FANAL-INSTALL-ATTEST-V1",
      attestationId: "ATT-" + profileSha256.slice(0, 12).toUpperCase(),
      issuedAtIso,
      edition: String(edition || "client"),
      appVersion: String(appVersion || "unknown"),
      installationProfile,
      genesisHash: String(pact.sharedGenesisHash || constitutionSha256.slice(0, 16)),
      integrityHashes: {
        constitutionSha256,
        profileSha256,
      },
    };

    const canonical = JSON.stringify(unsignedPayload);
    const sigB64 = cryptoMod
      .sign(null, Buffer.from(canonical, "utf8"), cryptoMod.createPrivateKey(nodeIdentity.signPrivatePem))
      .toString("base64url");

    return {
      ...unsignedPayload,
      signerPublicKeyB64: nodeIdentity.signPublicB64,
      signatureB64: sigB64,
    };
  }

  function verifyInstallationAttestation(attestation, catalog) {
    if (!cryptoMod) throw new Error("Node crypto required for verifyInstallationAttestation");
    const a = attestation && typeof attestation === "object" ? attestation : null;
    if (!a || a.schemaVersion !== "FANAL-INSTALL-ATTEST-V1") {
      return {
        overallStatus: "FAILED",
        softwareLayer: { passed: false, signatureValid: false, zeroPiiVerified: false, errors: ["ERR_ATTEST_SCHEMA"] },
        iaLayer: { coherenceStatus: "ANOMALY", score: 0, advisories: ["Schéma d'attestation incompatible."] },
        humanLayer: { status: "REJECTED", actionRequired: "Demander au client une attestation FANAL-INSTALL-ATTEST-V1 valide." },
      };
    }

    const unsignedPayload = {
      schemaVersion: a.schemaVersion,
      attestationId: a.attestationId,
      issuedAtIso: a.issuedAtIso,
      edition: a.edition,
      appVersion: a.appVersion,
      installationProfile: a.installationProfile,
      genesisHash: a.genesisHash,
      integrityHashes: a.integrityHashes,
    };

    const errors = [];
    let signatureValid = false;
    try {
      const pubKey = cryptoMod.createPublicKey({
        key: Buffer.from(String(a.signerPublicKeyB64 || ""), "base64url"),
        format: "der",
        type: "spki",
      });
      signatureValid = cryptoMod.verify(
        null,
        Buffer.from(JSON.stringify(unsignedPayload), "utf8"),
        pubKey,
        Buffer.from(String(a.signatureB64 || ""), "base64url")
      );
      if (!signatureValid) errors.push("ERR_ED25519_SIGNATURE_INVALID");
    } catch {
      errors.push("ERR_ED25519_KEY_OR_SIGNATURE_MALFORMED");
    }

    const serializedProfile = JSON.stringify(a.installationProfile || {});
    const hasEmailPii = /[^\s"@]+@[^\s"@]+\.[^\s"@]{2,}/.test(serializedProfile);
    const hasFiscalPii = /\b\d{9}RT\d{4}\b|\b\d{10}TQ\d{4}\b/i.test(serializedProfile);
    const zeroPiiVerified = !hasEmailPii && !hasFiscalPii && !Object.prototype.hasOwnProperty.call(a.installationProfile || {}, "bizName");
    if (!zeroPiiVerified) errors.push("ERR_PII_DETECTED_IN_ATTESTATION");

    const prof = a.installationProfile || {};
    const expectedProfileHash = sha256Hex(serializedProfile);
    if (!a.integrityHashes || a.integrityHashes.profileSha256 !== expectedProfileHash) {
      errors.push("ERR_PROFILE_HASH_MISMATCH");
    }
    if (!ALLOWED_SCALES.has(prof.scaleType)) errors.push("ERR_INVALID_SCALE");
    if (!prof.setupMandatoryPassed) errors.push("ERR_MANDATORY_SETUP_INCOMPLETE");
    if (!prof.loi25RprpConfigured) errors.push("ERR_LOI25_RPRP_MISSING");
    if (Number(prof.dshLawsCount) !== DSH_IMMUTABLE_LAWS.length) errors.push("ERR_DSH_LAWS_TAMPERED");
    if (!Number.isFinite(Number(prof.pricingFloorCad)) || Number(prof.pricingFloorCad) <= 0) errors.push("ERR_FLOOR_INVALID");
    if (Number(prof.escalationCount) < 1) errors.push("ERR_NO_RED_ESCALATIONS");

    const softwarePassed = signatureValid && zeroPiiVerified && errors.length === 0;

    // IA Deterministic Constitutional Coherence Audit
    const advisories = [];
    let coherenceScore = softwarePassed ? 100 : 20;
    if (prof.scaleType === "SME_CELL" && prof.taxRegime === "PETIT_FOURNISSEUR_EXEMPT") {
      coherenceScore -= 15;
      advisories.push("SME_EXEMPTION_CHECK: PME (6+ personnes) sous régime < 30 000 $ — vérifier statut OBNL ou organisme exempté.");
    }
    if (prof.taxRegime === "INSCRIT_TPS_TVQ" && !prof.tpsTvqRegistered) {
      coherenceScore -= 25;
      advisories.push("TAX_REGIME_GAP: Régime inscrit TPS/TVQ déclaré sans numéros validés.");
    }
    if (
      ["CPA_COMPTABLE", "AVOCAT_NOTAIRE", "MEDECIN_SANTE"].includes(prof.professionKey) &&
      prof.discountPolicy === "TIERED_MAX_10_PCT"
    ) {
      coherenceScore -= 10;
      advisories.push("REGULATED_PROFESSION_DISCOUNT: Profession régie avec rabais max 10 % — valider grille déontologique.");
    }
    if (catalog && typeof catalog.getDefaultFloorCad === "function") {
      const refFloor = catalog.getDefaultFloorCad(prof.professionKey, prof.sector);
      if (refFloor && Number(prof.pricingFloorCad) < refFloor * 0.25) {
        coherenceScore -= 15;
        advisories.push(`LOW_PRICING_FLOOR: Plancher (${prof.pricingFloorCad} $ CAD) très inférieur au repère secteur (${refFloor} $ CAD).`);
      }
    }

    const clampedScore = Math.max(0, Math.min(100, coherenceScore));
    const coherenceStatus = !softwarePassed
      ? "ANOMALY"
      : (advisories.length > 0 ? "REVIEW_RECOMMENDED" : "COHERENT");

    return {
      overallStatus: softwarePassed ? "VERIFIED" : "FAILED",
      attestationId: a.attestationId || "",
      genesisHash: a.genesisHash || "",
      softwareLayer: {
        passed: softwarePassed,
        signatureValid,
        zeroPiiVerified,
        errors,
      },
      iaLayer: {
        coherenceStatus,
        score: clampedScore,
        advisories,
      },
      humanLayer: {
        status: softwarePassed ? "PENDING_FOUNDER_SIGN_OFF" : "REJECTED",
        actionRequired: softwarePassed
          ? (advisories.length > 0 ? "Revoir les notes IA puis approuver le passeport client dans Studio." : "Prêt pour approbation 1-clic du fondateur.")
          : "Rejeter le passeport et exiger une ré-installation authentique.",
      },
    };
  }

  return {
    PASSWORD_RULES_SPEC,
    RESERVED_USERNAMES,
    ALLOWED_SCALES,
    CLOSED_TAX_REGIMES,
    CLOSED_TONE_REGISTERS,
    CLOSED_DISCOUNT_POLICIES,
    DSH_IMMUTABLE_LAWS,
    SELECTABLE_RED_ESCALATIONS,
    normalizeScaleKey,
    validateUsername,
    evaluatePasswordPolicy,
    validateQuebecFiscalNumbers,
    validateClosedConstitutionFields,
    validateSetupPayload,
    evaluateSetupReadiness,
    buildClosedConstitutionDocument,
    buildInstallationAttestation,
    verifyInstallationAttestation,
  };
});
