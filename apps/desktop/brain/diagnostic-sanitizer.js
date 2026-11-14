// supervisor/diagnostic-sanitizer.js — deterministic, side-effect-free redaction
// and sanitized diagnostic bundle builders shared by supervisor & desktop main.
// Created by J.Franco. MIT license.
"use strict";

const crypto = require("node:crypto");
const os = require("node:os");

function redactSecretsAndPaths(rawText) {
  let out = String(rawText ?? "");
  if (!out) return "";

  // Credentials in URLs & sensitive query parameters
  out = out.replace(/(https?:\/\/)[^/\s:@]+:[^/\s@]+@/gi, "$1[REDACTED_CREDS]@");
  out = out.replace(/([?&](?:token|api_?key|key|secret|password|passphrase|auth|code|sig|signature)=)([^&#\s]+)/gi, "$1[REDACTED]");

  // Known token & API key formats
  out = out.replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_API_KEY]");
  out = out.replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{12,}\b/g, "[REDACTED_TOKEN]");
  out = out.replace(/\bgithub_pat_[A-Za-z0-9_]{12,}\b/g, "[REDACTED_TOKEN]");
  out = out.replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, "$1[REDACTED_TOKEN]");

  // CLI password / API-key flags (POSIX/Windows command lines & stack logs)
  out = out.replace(
    /(--password|--employee-password|--lead-password|--token|--api-key)(?:\s+|=)("[^"]*"|'[^']*'|\S+)/gi,
    "$1 [REDACTED]"
  );

  // PEM private key blocks & quoted/unquoted secret key-value pairs
  out = out.replace(
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
    "[REDACTED_PRIVATE_KEY]"
  );
  // Quoted JSON or JS key-value secrets (includes brain.json "key", vault-auth salts/hashes, PEM keys)
  out = out.replace(
    /(["'])(masterPassword|password|api[_-]?key|osProtectedKeyB64|recoveryKeyHex|boxPrivatePem|signPrivatePem|privateKey|masterHash|masterSalt|recoverySalt|recoveryHash|secret|access_token|refresh_token|salt|hash|key)\1(\s*:\s*)(?:"[^"]*"|'[^']*'|[^,}\]\n]+)/gi,
    '$1$2$1$3"[REDACTED]"'
  );
  out = out.replace(
    /\b(masterPassword|password|api[_-]?key|osProtectedKeyB64|recoveryKeyHex|boxPrivatePem|signPrivatePem|privateKey|masterHash|masterSalt|recoverySalt|recoveryHash|secret|access_token|refresh_token|salt|hash|key)(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,}\]\n]+)/gi,
    "$1$2[REDACTED]"
  );

  // Machine-local home paths exposing local OS account usernames
  out = out.replace(/\/Users\/[^/\s:"'<>|]+/g, "/Users/[USER]");
  out = out.replace(/\/home\/[^/\s:"'<>|]+/g, "/home/[USER]");
  out = out.replace(/([A-Za-z]:\\Users\\)[^\\\s:"'<>|]+/gi, "$1[USER]");
  out = out.replace(/([A-Za-z]:\/Users\/)[^/\s:"'<>|]+/gi, "$1[USER]");

  // Emails & North American phone patterns if caller skipped veil()
  out = out.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[EMAIL]");
  out = out.replace(/\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]\d{3}[-.\s]\d{4}\b/g, "[TEL_]");

  return out;
}

function extractSanitizedText(value, extraSanitizeFn) {
  if (value === null || value === undefined) return null;
  let raw;
  // Defensively handle pre-fix persisted ticket fields stored as `{ text, vault }`
  if (typeof value === "object" && typeof value.text === "string") {
    raw = value.text;
  } else {
    raw = String(value);
  }
  let masked = raw;
  if (typeof extraSanitizeFn === "function") {
    try {
      const r = extraSanitizeFn(raw);
      if (typeof r === "string") masked = r;
      else if (r && typeof r.text === "string") masked = r.text;
    } catch {
      masked = raw;
    }
  }
  return redactSecretsAndPaths(masked);
}

function sanitizeTicketRecord(ticket, extraSanitizeFn) {
  const t = ticket && typeof ticket === "object" ? ticket : {};
  const env = t.environment && typeof t.environment === "object" ? t.environment : {};
  const ui = t.uiContext && typeof t.uiContext === "object" ? t.uiContext : {};
  const safeMsg = extractSanitizedText(t.sanitizedUserReport || "", extraSanitizeFn) || "";
  const safeDoc = t.sanitizedDocStructureSample != null
    ? extractSanitizedText(t.sanitizedDocStructureSample, extraSanitizeFn)
    : null;
  const safeLogs = Array.isArray(t.sanitizedRecentLogs)
    ? t.sanitizedRecentLogs.slice(-15).map((l) => extractSanitizedText(l, extraSanitizeFn) || "")
    : [];

  return {
    ticketId: String(t.ticketId || ""),
    createdAtIso: String(t.createdAtIso || ""),
    professionProfile: String(t.professionProfile || ""),
    environment: {
      platform: String(env.platform || ""),
      osRelease: String(env.osRelease || ""),
      arch: String(env.arch || ""),
      ramFreeMb: Number(env.ramFreeMb || 0),
      computeMode: String(env.computeMode || ""),
      appBinaryVersion: String(env.appBinaryVersion || ""),
      rulesBundleVersion: String(env.rulesBundleVersion || ""),
    },
    uiContext: {
      currentMode: String(ui.currentMode || ""),
      activeApicesCount: Number(ui.activeApicesCount || 0),
      activeRedBlockersCount: Number(ui.activeRedBlockersCount || 0),
      lastErrorCode: String(ui.lastErrorCode || "NONE"),
    },
    sanitizedUserReport: safeMsg,
    sanitizedDocStructureSample: safeDoc,
    sanitizedRecentLogs: safeLogs,
    loi25AttestationHash: crypto
      .createHash("sha256")
      .update(safeMsg + "\n" + (safeDoc || ""))
      .digest("hex")
      .slice(0, 16),
  };
}

function formatDiagnosticBundleMarkdown(bundle) {
  const b = bundle && typeof bundle === "object" ? bundle : {};
  const env = b.environment || {};
  const vault = b.vaultStatus || {};
  const lines = [
    "# Fanal — Sanitized Diagnostic Export (Loi 25)",
    "",
    `- Generated: ${b.createdAtIso || ""}`,
    `- App version: ${env.appVersion || "unknown"}`,
    `- Platform: ${env.platform || ""} (${env.arch || ""}), OS ${env.osRelease || ""}`,
    `- Runtime: Node ${env.nodeVersion || ""}${env.electronVersion ? `, Electron ${env.electronVersion}` : ""}`,
    `- Free RAM: ${env.ramFreeMb ?? 0} MB`,
    `- Vault: configured=${Boolean(vault.configured)}, locked=${Boolean(vault.locked)}, biometricLinked=${Boolean(vault.biometricLinked)}`,
    `- Attestation hash: ${b.bundleHash || ""}`,
    "",
    "## Recent Startup / Runtime Logs (Redacted)",
    "",
  ];
  const logs = Array.isArray(b.sanitizedLogs) ? b.sanitizedLogs : [];
  if (logs.length === 0) {
    lines.push("_No diagnostic log lines recorded._");
  } else {
    lines.push("```text", ...logs, "```");
  }
  const tickets = Array.isArray(b.recentTickets) ? b.recentTickets : [];
  lines.push("", `## Recent Sanitized Support Tickets (${tickets.length})`, "");
  if (tickets.length === 0) {
    lines.push("_No support tickets recorded._");
  } else {
    for (const tk of tickets) {
      lines.push(`- **${tk.ticketId}** (${tk.createdAtIso}): ${tk.sanitizedUserReport || "(empty)"}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function buildSanitizedDiagnosticReport(input = {}) {
  const extraSanitizeFn = typeof input.sanitizeText === "function" ? input.sanitizeText : null;
  const vs = input.vaultStatus && typeof input.vaultStatus === "object" ? input.vaultStatus : {};

  const rawLogs = []
    .concat(Array.isArray(input.startupLogs) ? input.startupLogs : [])
    .concat(Array.isArray(input.recentLogs) ? input.recentLogs : [])
    .slice(-50)
    .map((line) => extractSanitizedText(line, extraSanitizeFn) || "")
    .filter(Boolean);

  const tickets = (Array.isArray(input.recentTickets) ? input.recentTickets : [])
    .slice(-10)
    .map((tk) => sanitizeTicketRecord(tk, extraSanitizeFn));

  const bundleCore = {
    schema: "fanal-diagnostic-v1",
    createdAtIso: new Date().toISOString(),
    loi25Redacted: true,
    environment: {
      appVersion: String(input.appVersion || ""),
      platform: String(input.platform || process.platform),
      arch: String(input.arch || process.arch),
      osRelease: String(input.osRelease || os.release()),
      nodeVersion: String(input.nodeVersion || process.versions.node || ""),
      electronVersion: String(input.electronVersion || process.versions.electron || ""),
      ramFreeMb: Math.round(os.freemem() / 1048576),
    },
    vaultStatus: {
      configured: Boolean(vs.configured),
      locked: Boolean(vs.locked),
      biometricLinked: Boolean(vs.biometricLinked),
    },
    sanitizedLogs: rawLogs,
    recentTickets: tickets,
  };

  const bundleHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(bundleCore))
    .digest("hex")
    .slice(0, 16);

  const bundle = { ...bundleCore, bundleHash };
  return {
    bundle,
    markdown: formatDiagnosticBundleMarkdown(bundle),
  };
}

module.exports = {
  redactSecretsAndPaths,
  extractSanitizedText,
  sanitizeTicketRecord,
  formatDiagnosticBundleMarkdown,
  buildSanitizedDiagnosticReport,
};
