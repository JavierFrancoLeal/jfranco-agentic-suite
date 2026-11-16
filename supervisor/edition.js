// supervisor/edition.js — Single source of truth for Fanal editions:
//   - "client" (default): Fanal PYME app (ca.trasunto.fanal, port 8787, ~/.dsh)
//   - "studio":           Fanal Studio Creator/Operator Console
//                         (ca.trasunto.fanal.studio, port 8788, ~/.dsh/trasunto-studio-data)
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const EDITIONS = Object.freeze({
  client: Object.freeze({
    id: "client",
    appId: "ca.trasunto.fanal",
    productName: "Fanal",
    shortBrandTag: "TRASUNTO",
    windowTitle: "Fanal",
    defaultPort: 8787,
    defaultHttpsPort: 8443,
    electronUserDataName: "Fanal",
    electronPartition: "persist:fanal-client-workspace",
    allowCreatorRoutes: false,
  }),
  studio: Object.freeze({
    id: "studio",
    appId: "ca.trasunto.fanal.studio",
    productName: "Fanal Studio",
    shortBrandTag: "TRASUNTO STUDIO",
    windowTitle: "Fanal Studio · Trasunto Console",
    defaultPort: 8788,
    defaultHttpsPort: 8444,
    electronUserDataName: "Fanal Studio",
    electronPartition: "persist:fanal-studio-workspace",
    allowCreatorRoutes: true,
  }),
});

function readManifestEdition(searchDirs) {
  for (const dir of searchDirs) {
    if (!dir) continue;
    try {
      const p = path.join(dir, "edition.json");
      if (fs.existsSync(p)) {
        const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
        if (parsed && typeof parsed.edition === "string") {
          const norm = parsed.edition.trim().toLowerCase();
          if (norm === "studio" || norm === "client") return norm;
        }
      }
    } catch {}
  }
  return "";
}

function resolveEdition(options = {}) {
  const cliArgs = Array.isArray(options.cliArgs) ? options.cliArgs : [];
  const env = options.env || process.env;
  const searchDirs = [
    options.appDir,
    path.dirname(__dirname),
    __dirname,
    path.resolve(__dirname, ".."),
  ];

  let raw = "";
  if (cliArgs.includes("--studio")) raw = "studio";
  else if (cliArgs.includes("--client")) raw = "client";
  else if (typeof env.FANAL_EDITION === "string" && env.FANAL_EDITION.trim()) {
    raw = env.FANAL_EDITION.trim().toLowerCase();
  } else {
    raw = readManifestEdition(searchDirs) || "client";
  }

  const id = raw === "studio" ? "studio" : "client";
  const base = EDITIONS[id];
  const home = typeof options.homedir === "string" && options.homedir ? options.homedir : os.homedir();
  const defaultDataDir = id === "studio"
    ? path.join(home, ".dsh", "trasunto-studio-data")
    : path.join(home, ".dsh");
  const defaultDesktopDataDir = id === "studio"
    ? path.join(home, ".dsh", "trasunto-studio-data")
    : path.join(home, ".dsh", "supervisor-data");

  return Object.freeze({
    ...base,
    defaultDataDir,
    defaultDesktopDataDir,
    targetUrl: `http://127.0.0.1:${base.defaultPort}/dashboard`,
  });
}

function sanitizeDeepStrings(val, redactFn, depth = 0) {
  if (depth > 8 || val == null) return val;
  if (typeof val === "string") return redactFn(val);
  if (Array.isArray(val)) return val.slice(0, 60).map((item) => sanitizeDeepStrings(item, redactFn, depth + 1));
  if (typeof val === "object") {
    const out = {};
    for (const [k, v] of Object.entries(val).slice(0, 40)) {
      out[redactFn(String(k))] = sanitizeDeepStrings(v, redactFn, depth + 1);
    }
    return out;
  }
  return val;
}

function inspectSanitizedDiagnosticBundle({ rawContent, redactFn }) {
  const redact = typeof redactFn === "function" ? redactFn : (s) => String(s || "");
  const text = String(rawContent || "").trim();
  if (!text) return { ok: false, error: "empty diagnostic content" };
  if (text.length > 262144) return { ok: false, error: "diagnostic bundle exceeds 256 KB limit" };

  let format = "markdown";
  let parsed = null;
  if (text.startsWith("{")) {
    try {
      const obj = JSON.parse(text);
      parsed = sanitizeDeepStrings(obj && obj.diagnostic ? obj.diagnostic : obj, redact);
      format = "json";
    } catch {
      return { ok: false, error: "invalid JSON diagnostic bundle" };
    }
  }

  const cleanText = redact(text);
  const caseId = "STD-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const importedAt = new Date().toISOString();

  if (parsed && typeof parsed === "object") {
    const vault = parsed.vaultStatus || parsed.vault || {};
    const tickets = Array.isArray(parsed.recentTickets) ? parsed.recentTickets : [];
    const logs = Array.isArray(parsed.startupLogs) ? parsed.startupLogs : [];
    const tel = parsed.telemetrySummary && typeof parsed.telemetrySummary === "object"
      ? parsed.telemetrySummary
      : null;
    return {
      ok: true,
      summary: {
        caseId,
        importedAt,
        format,
        loi25Redacted: true,
        appVersion: String(parsed.appVersion || parsed.version || "unknown"),
        platform: String(parsed.platform || parsed.os || "unknown"),
        scaleType: String(parsed.scaleType || ""),
        professionKey: String(parsed.professionKey || ""),
        sector: String(parsed.sector || ""),
        vaultConfigured: Boolean(vault.configured),
        biometricLinked: Boolean(vault.biometricLinked),
        ticketCount: tickets.length,
        startupLogCount: logs.length,
        latestTicketId: tickets.length ? String(tickets[tickets.length - 1].ticketId || "") : "",
        latestNote: tickets.length ? String(tickets[tickets.length - 1].userProblemDescription || "").slice(0, 220) : "",
        tailLogs: logs.slice(-8).map((l) => String(l).slice(0, 180)),
        telemetrySummary: tel ? {
          totals: tel.totals || null,
          byModel: Array.isArray(tel.byModel) ? tel.byModel.slice(0, 10) : [],
          byTaskType: Array.isArray(tel.byTaskType) ? tel.byTaskType.slice(0, 12) : [],
          byActor: Array.isArray(tel.byActor) ? tel.byActor.slice(0, 12) : [],
        } : null,
      },
    };
  }

  const lines = cleanText.split(/\r?\n/).filter(Boolean);
  return {
    ok: true,
    summary: {
      caseId,
      importedAt,
      format,
      loi25Redacted: true,
      appVersion: (cleanText.match(/App Version:\s*([^\s\n]+)/i) || [])[1] || "markdown",
      platform: (cleanText.match(/Platform:\s*([^\n]+)/i) || [])[1] || "unknown",
      vaultConfigured: /configured\s*:\s*true/i.test(cleanText),
      biometricLinked: /biometric(?:Linked)?\s*:\s*true/i.test(cleanText),
      ticketCount: (cleanText.match(/ticketId|FNL-/gi) || []).length,
      startupLogCount: lines.length,
      latestTicketId: "",
      latestNote: lines.slice(0, 6).join(" · ").slice(0, 220),
      tailLogs: lines.slice(-6).map((l) => l.slice(0, 180)),
    },
  };
}

module.exports = {
  EDITIONS,
  resolveEdition,
  inspectSanitizedDiagnosticBundle,
};
