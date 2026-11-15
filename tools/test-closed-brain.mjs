#!/usr/bin/env node
// test-closed-brain.mjs — unit & UI wiring tests for Fanal's Apple-style
// closed curated dual brain (exclusively DeepSeek + Google Gemini), Dual BYOK
// key isolation, AESGCM2 provider decryption parity, and Ollama/open-selector removal.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(import.meta.url);
const bc = req(join(ROOT, "supervisor", "brain-catalog.js"));

const {
  DEEPSEEK_CHAT_URL,
  GEMINI_OPENAI_BASE,
  sealSettingsObject,
  unsealSettingsObject,
  decryptProvidersText,
  encryptProvidersText,
  normalizeBrainMode,
  validateClosedBrainUpdate,
  routeBrainRequest,
  buildDerivedProvidersRecord,
  buildBrainHttpRequest,
  buildBrainPublicSummary,
} = bc;

function run() {
  // 1. Open model / arbitrary baseUrl / retired local Ollama overrides are strictly rejected at API boundary
  for (const badPayload of [
    null,
    [],
    { baseUrl: "https://evil.example/v1" },
    { fast: { model: "gpt-4o", baseUrl: "https://api.openai.com/v1" } },
    { deep: { model: "claude-3" } },
    { rescue: { model: "gemini-3.1-pro", baseUrl: GEMINI_OPENAI_BASE } },
    { mode: "custom_anything" },
    { mode: "local_sovereign" },
    { localModel: "qwen2.5:7b" },
    { deepseekKey: "sk-bad\ninjected-header" },
  ]) {
    const res = validateClosedBrainUpdate(badPayload);
    assert.equal(res.ok, false, `must reject payload: ${JSON.stringify(badPayload)}`);
    assert.equal(res.status, 400);
  }

  for (const okPayload of [
    { mode: "dual_cloud", deepseekKey: "sk-ds-123456789", geminiKey: "AIzaSyGeminiTestKey12345" },
    { clearDeepseekKey: true, clearGeminiKey: true },
  ]) {
    assert.equal(validateClosedBrainUpdate(okPayload).ok, true);
  }

  // 2. Dual BYOK key isolation: DeepSeek key MUST NEVER leak into Google Gemini rescue endpoint
  const dsOnlySettings = { brainMode: "dual_cloud", apiKey: "sk-deepseek-only-secret-9999" };
  const dsFast = routeBrainRequest({ model: "deepseek-flash", settings: dsOnlySettings, env: {} });
  const dsFastShort = routeBrainRequest({ model: "flash", settings: dsOnlySettings, env: {} });
  const dsDeep = routeBrainRequest({ model: "deepseek-v4-pro", settings: dsOnlySettings, env: {} });
  const dsDeepShort = routeBrainRequest({ model: "deep", settings: dsOnlySettings, env: {} });
  const gemRescueNoKey = routeBrainRequest({ model: "deepseek-v4-pro", tierArg: "rescue", settings: dsOnlySettings, env: {} });
  assert.equal(dsFast.baseUrl, DEEPSEEK_CHAT_URL);
  assert.equal(dsFast.model, "deepseek-flash");
  assert.equal(dsFast.tier, "fast");
  assert.equal(dsFastShort.model, "deepseek-flash");
  assert.equal(dsFast.key, "sk-deepseek-only-secret-9999");
  assert.equal(dsDeep.model, "deepseek-v4-pro");
  assert.equal(dsDeepShort.model, "deepseek-v4-pro");
  assert.equal(gemRescueNoKey.provider, "gemini");
  assert.equal(gemRescueNoKey.baseUrl, GEMINI_OPENAI_BASE);
  assert.equal(gemRescueNoKey.model, "gemini-3.8-flash");
  assert.equal(gemRescueNoKey.key, "", "DeepSeek key MUST NEVER be sent to Google Gemini endpoint");

  // 3. Dual keys populated -> separate hemispheres use separate keys and current Gemini models
  const dualSettings = {
    brainMode: "dual_cloud",
    apiKey: "sk-deepseek-11112222",
    geminiApiKey: "AIzaSyGeminiHemisphere33334444",
  };
  const gemFlash = routeBrainRequest({ model: "flash", tierArg: "rescue", settings: dualSettings, env: {} });
  const gemArgon = routeBrainRequest({ model: "gemini-4-argon", tierArg: "rescue", settings: dualSettings, env: {} });
  assert.equal(gemFlash.model, "gemini-3.8-flash");
  assert.equal(gemFlash.key, "AIzaSyGeminiHemisphere33334444");
  assert.equal(gemArgon.model, "gemini-4-argon");
  assert.equal(gemArgon.key, "AIzaSyGeminiHemisphere33334444");

  // Even if an old/tampered providers.json carries an arbitrary endpoint, closed router ignores it
  const tamperedProviders = {
    fast: { baseUrl: "https://attacker.invalid/v1", model: "evil-model", key: "steal" },
    rescue: { baseUrl: "https://attacker.invalid/v1", model: "gemini-3.1-pro" },
  };
  const safeFast = routeBrainRequest({ model: "deepseek-flash", settings: dualSettings, providers: tamperedProviders, env: {} });
  assert.equal(safeFast.baseUrl, DEEPSEEK_CHAT_URL);
  assert.equal(safeFast.model, "deepseek-flash");

  // 4. Legacy local_sovereign configs normalize cleanly to closed DeepSeek + Gemini dual_cloud
  const legacyLocal = { ...dualSettings, brainMode: "local_sovereign", localModel: "qwen2.5:7b" };
  const upgradedFast = routeBrainRequest({ model: "deepseek-flash", settings: legacyLocal, env: {} });
  const upgradedRescue = routeBrainRequest({ model: "deepseek-v4-pro", tierArg: "rescue", settings: legacyLocal, env: {} });
  assert.equal(upgradedFast.mode, "dual_cloud");
  assert.equal(upgradedFast.isLocal, false);
  assert.equal(upgradedFast.baseUrl, DEEPSEEK_CHAT_URL);
  assert.equal(upgradedRescue.baseUrl, GEMINI_OPENAI_BASE);
  assert.equal(normalizeBrainMode({}, { fast: { baseUrl: "http://localhost:11434/v1" } }), "dual_cloud");

  // 5. Public summary never exposes plaintext keys or stale gemini-3.1-pro
  const pub = buildBrainPublicSummary({ settings: dualSettings, providers: buildDerivedProvidersRecord(dualSettings), env: {} });
  const pubJson = JSON.stringify(pub);
  assert.equal(pubJson.includes("sk-deepseek-11112222"), false);
  assert.equal(pubJson.includes("AIzaSyGeminiHemisphere33334444"), false);
  assert.equal(pubJson.includes("gemini-3.1-pro"), false);
  assert.equal(pub.mode, "dual_cloud");
  assert.equal(pub.deepseek.configured, true);
  assert.equal(pub.gemini.configured, true);
  assert.equal(pub.deepseek.masked, "••••2222");
  assert.equal(pub.gemini.masked, "••••4444");
  assert.equal(pub.rescue.model, "gemini-3.8-flash");
  assert.equal(pub.rescue.deepModel, "gemini-4-argon");
  assert.equal(pub.keysEncryptedAtRest, false);
  assert.equal(pub.keyStorageMode, "silo_0o600");

  const pubEnc = buildBrainPublicSummary({
    settings: dualSettings,
    providers: buildDerivedProvidersRecord(dualSettings),
    env: { FANAL_MASTER_KEY: "master-passphrase-32-chars-minimum" },
  });
  assert.equal(pubEnc.keysEncryptedAtRest, true);
  assert.equal(pubEnc.keyStorageMode, "aes256gcm_scrypt");

  // 6. Outbound HTTP request isolation: DeepSeek bearer never sent to Gemini; Local sends no Authorization
  const outDs = buildBrainHttpRequest({ rt: dsFast, prompt: "hello" });
  const outGem = buildBrainHttpRequest({ rt: gemArgon, prompt: "verify" });
  const gemHotSwapDeep = routeBrainRequest({
    model: "deep",
    tierArg: "rescue",
    settings: dualSettings,
    providers: {},
    env: {},
  });
  assert.equal(gemHotSwapDeep.provider, "gemini");
  assert.equal(gemHotSwapDeep.model, "gemini-4-argon", "deep/argon with rescue tierArg must route to gemini-4-argon");
  const gemHotSwapFlash = routeBrainRequest({
    model: "deepseek-flash",
    tierArg: "rescue",
    settings: dualSettings,
    providers: {},
    env: {},
  });
  assert.equal(gemHotSwapFlash.provider, "gemini");
  assert.equal(gemHotSwapFlash.model, "gemini-3.8-flash", "deepseek-flash with rescue tierArg must route to gemini-3.8-flash");
  const outGemMissing = buildBrainHttpRequest({ rt: gemRescueNoKey, prompt: "verify" });
  assert.equal(outDs.url, DEEPSEEK_CHAT_URL);
  assert.equal(outDs.headers.Authorization, "Bearer sk-deepseek-only-secret-9999");
  assert.equal(outGem.url, `${GEMINI_OPENAI_BASE}/chat/completions`);
  assert.equal(outGem.headers.Authorization, "Bearer AIzaSyGeminiHemisphere33334444");
  assert.equal(outGemMissing.headers.Authorization, undefined);

  // 7. Salted AESGCM2 settings/providers encryption & wrong-key / missing-key safety
  const mk = "master-passphrase-32-chars-minimum";
  const sealedSettings = sealSettingsObject(dualSettings, mk);
  assert.ok(sealedSettings.apiKey.startsWith("AESGCM2:"));
  assert.ok(sealedSettings.geminiApiKey.startsWith("AESGCM2:"));
  assert.equal(JSON.stringify(sealedSettings).includes("sk-deepseek-11112222"), false);
  assert.equal(JSON.stringify(sealedSettings).includes("AIzaSyGeminiHemisphere33334444"), false);
  const unsealed = unsealSettingsObject(sealedSettings, mk);
  assert.equal(unsealed.apiKey, "sk-deepseek-11112222");
  assert.equal(unsealed.geminiApiKey, "AIzaSyGeminiHemisphere33334444");
  const wrongUnseal = unsealSettingsObject(sealedSettings, "wrong-key");
  assert.equal(wrongUnseal.apiKey, undefined);
  assert.equal(wrongUnseal.geminiApiKey, undefined);

  const sealed = encryptProvidersText({ fast: { model: "deepseek-flash" } }, mk);
  assert.ok(sealed.startsWith("AESGCM2:"));
  assert.deepEqual(decryptProvidersText(sealed, mk), { fast: { model: "deepseek-flash" } });
  assert.deepEqual(decryptProvidersText(sealed, "wrong-passphrase"), {});
  assert.deepEqual(buildDerivedProvidersRecord(dualSettings).mode, "dual_cloud");

  // 8. Closed UI, honest storage labels, Ollama removal & all-10-locale coverage assertions
  const serverSrc = readFileSync(join(ROOT, "supervisor", "server.js"), "utf8");
  const dashSrc = readFileSync(join(ROOT, "supervisor", "dashboard.html"), "utf8");
  const i18nSrc = readFileSync(join(ROOT, "supervisor", "dashboard-i18n.js"), "utf8");
  assert.equal(serverSrc.includes("gemini-3.1-pro"), false, "server.js must not reference stale gemini-3.1-pro");
  assert.equal(serverSrc.includes("11434"), false, "server.js must not connect to Ollama port 11434");
  assert.equal(dashSrc.includes('id="brainFast"'), false, "dashboard.html must remove open #brainFast input");
  assert.equal(dashSrc.includes('id="brainDeep"'), false, "dashboard.html must remove open #brainDeep input");
  assert.equal(dashSrc.includes('id="brainBase"'), false, "dashboard.html must remove open #brainBase input");
  assert.equal(dashSrc.includes("llama3."), false, "dashboard.html must not reference local llama models");
  assert.equal(dashSrc.includes("qwen2.5"), false, "dashboard.html must not reference local qwen models");
  assert.equal(dashSrc.includes('id="modeLocalBtn"'), false, "dashboard.html must remove Local Ollama button");
  assert.equal(dashSrc.includes('id="localSovereignPanel"'), false, "dashboard.html must remove Local Ollama panel");
  assert.equal(dashSrc.includes('id="brainLocalDetectBtn"'), false, "dashboard.html must remove Ollama detect button");
  assert.equal(dashSrc.includes('id="wizBrainSel"'), false, "dashboard.html must remove Local vs Cloud wizard dropdown");
  assert.ok(dashSrc.includes('id="vaultDeepseekInput"'), "dashboard.html must include DeepSeek Vault slot");
  assert.ok(dashSrc.includes('id="vaultGeminiInput"'), "dashboard.html must include Gemini Vault slot");

  const i18nCtx = { window: {} };
  vm.runInNewContext(i18nSrc, i18nCtx);
  for (const loc of ["en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar"]) {
    const dict = i18nCtx.window.I18N[loc];
    assert.ok(dict, `missing locale ${loc}`);
    for (const k of ["reglagesTitle", "brainCardTitle", "diagTitle", "vaultEncryptedBadge", "vaultLockSiloBadge", "vaultSiloBadge", "imapGmailHint", "vaultCurtainTitle", "stType_email", "stType_intake"]) {
      assert.ok(dict[k], `locale ${loc} missing key ${k}`);
    }
  }

  console.log("CLOSED_BRAIN_TESTS PASSED");
}

run();
