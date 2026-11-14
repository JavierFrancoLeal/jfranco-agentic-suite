// Fanal Desktop — pure URL, origin, IPC-sender, and folder-sandbox helpers.
// Extracted from main.js so cross-platform unit tests run cleanly without Electron.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const FANAL_DEFAULT_TARGET_URL = "http://127.0.0.1:8787/dashboard";
const URI_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const WINDOWS_DRIVE_RE = /^[a-zA-Z]:(?:[\\/]|$)/;
const VALID_SECTOR_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function tryParseHttpUrl(rawUrl) {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if ((u.protocol !== "http:" && u.protocol !== "https:") || !u.hostname) return null;
    if (!u.origin || u.origin === "null") return null;
    return u;
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "127.0.0.1" || h === "localhost" || h === "::1" || h === "[::1]";
}

function parseAllowedTargetOrigin(rawUrl, fallbackUrl = FANAL_DEFAULT_TARGET_URL) {
  const parsed = tryParseHttpUrl(rawUrl) || tryParseHttpUrl(fallbackUrl) || new URL(FANAL_DEFAULT_TARGET_URL);
  return {
    url: parsed.href,
    origin: parsed.origin,
    host: parsed.hostname.replace(/^\[|\]$/g, ""),
    port: parsed.port ? Number(parsed.port) : (parsed.protocol === "https:" ? 443 : 80),
    isLocal: isLoopbackHost(parsed.hostname),
  };
}

function isAllowedExternalUrl(rawUrl) {
  return tryParseHttpUrl(rawUrl) !== null;
}

function isAllowedDrawerPopupUrl(rawUrl) {
  const parsed = tryParseHttpUrl(rawUrl);
  if (!parsed) return false;
  return parsed.protocol === "https:" || (parsed.protocol === "http:" && isLoopbackHost(parsed.hostname));
}

function isAllowedMainNavigation(rawUrl, allowedOrigin) {
  if (typeof allowedOrigin !== "string" || !allowedOrigin || allowedOrigin === "null") return false;
  const parsed = tryParseHttpUrl(rawUrl);
  return parsed !== null && parsed.origin === allowedOrigin;
}

function isTrustedIpcSender({ senderMatchesPrimary, senderUrl, targetOrigin }) {
  return Boolean(senderMatchesPrimary) && isAllowedMainNavigation(senderUrl, targetOrigin);
}

function isValidSectorId(sectorId) {
  return typeof sectorId === "string" && VALID_SECTOR_ID_RE.test(sectorId);
}

function looksLikeBlockedUriScheme(rawTarget) {
  if (typeof rawTarget !== "string") return false;
  const trimmed = rawTarget.trim();
  return URI_SCHEME_RE.test(trimmed) && !WINDOWS_DRIVE_RE.test(trimmed);
}

function isPathInsideRoot(rootResolved, candidateResolved, options = {}) {
  const pathImpl = options.pathImpl || path;
  const allowRoot = Boolean(options.allowRoot);
  if (typeof rootResolved !== "string" || typeof candidateResolved !== "string") return false;
  const rel = pathImpl.relative(rootResolved, candidateResolved);
  if (rel === "") return allowRoot;
  if (rel === ".." || /^\.\.(?:[\\/]|$)/.test(rel) || pathImpl.isAbsolute(rel)) return false;
  return true;
}

function toSafeFileUrl(resolvedPath, options = {}) {
  const pathImpl = options.pathImpl || path;
  if (pathImpl === path) {
    return pathToFileURL(resolvedPath).href;
  }
  const normalized = String(resolvedPath || "").replace(/\\/g, "/");
  const prefixed = normalized.startsWith("/") ? normalized : "/" + normalized;
  const encoded = prefixed
    .split("/")
    .map((seg, idx) => (idx === 1 && /^[a-zA-Z]:$/.test(seg) ? seg : encodeURIComponent(seg)))
    .join("/");
  return "file://" + encoded;
}

function canonicalizeFolderPath(folderPath, options = {}) {
  const pathImpl = options.pathImpl || path;
  const statSync = options.statSync || fs.statSync;
  const realpathSync = options.realpathSync || fs.realpathSync;
  if (typeof folderPath !== "string" || !folderPath.trim() || folderPath.includes("\0")) {
    return { ok: false, error: "Invalid folder path" };
  }
  const abs = pathImpl.resolve(folderPath.trim());
  let st;
  try {
    st = statSync(abs);
  } catch {
    return { ok: false, error: "Folder does not exist: " + abs };
  }
  if (!st || !st.isDirectory()) {
    return { ok: false, error: "Path is not a directory: " + abs };
  }
  let real = abs;
  try {
    real = realpathSync(abs);
  } catch {
    return { ok: false, error: "Cannot resolve real folder path: " + abs };
  }
  return { ok: true, resolvedPath: real, activeFolderChip: pathImpl.basename(real) };
}

function resolveSandboxedFile(allowedRoot, requestedPath, options = {}) {
  const pathImpl = options.pathImpl || path;
  const statSync = options.statSync || fs.statSync;
  const realpathSync = options.realpathSync || fs.realpathSync;
  const basenameOnly = Boolean(options.basenameOnly);
  const requireExisting = options.requireExisting !== false;

  if (typeof allowedRoot !== "string" || !allowedRoot.trim() || allowedRoot.includes("\0")) {
    return { ok: false, status: "FNL-SANDBOX-502", error: "Connected client folder not configured" };
  }
  if (typeof requestedPath !== "string" || !requestedPath.trim() || requestedPath.includes("\0") || looksLikeBlockedUriScheme(requestedPath)) {
    return { ok: false, status: "FNL-SANDBOX-502", error: "Invalid or blocked file target" };
  }

  const rootResolved = pathImpl.resolve(allowedRoot.trim());
  let rootReal = rootResolved;
  try {
    const rootStat = statSync(rootResolved);
    if (!rootStat || !rootStat.isDirectory()) {
      return { ok: false, status: "FNL-SANDBOX-502", error: "Connected root is not a directory" };
    }
    rootReal = realpathSync(rootResolved);
  } catch {
    return { ok: false, status: "FNL-SANDBOX-502", error: "Connected client folder unavailable" };
  }

  const req = requestedPath.trim();
  if (basenameOnly) {
    if (req === "." || req === ".." || req.includes("/") || req.includes("\\")) {
      return { ok: false, status: "FNL-SANDBOX-502", error: "Traversal or nested path rejected for step filename" };
    }
  }

  const candidateAbs = pathImpl.resolve(rootReal, req);
  const insideLexicalOrReal =
    isPathInsideRoot(rootReal, candidateAbs, { pathImpl }) ||
    isPathInsideRoot(rootResolved, candidateAbs, { pathImpl });
  if (!insideLexicalOrReal) {
    return { ok: false, status: "FNL-SANDBOX-502", error: "Path escapes connected client folder" };
  }

  let targetReal = candidateAbs;
  if (requireExisting) {
    try {
      targetReal = realpathSync(candidateAbs);
      const st = statSync(targetReal);
      if (!st || !st.isFile()) {
        return { ok: false, status: "FNL-SANDBOX-502", error: "Target inside connected folder is not a regular file" };
      }
    } catch {
      return { ok: false, status: "FNL-SANDBOX-502", error: "File does not exist inside connected folder" };
    }
    if (!isPathInsideRoot(rootReal, targetReal, { pathImpl })) {
      return { ok: false, status: "FNL-SANDBOX-502", error: "Symlink resolves outside connected client folder" };
    }
  }

  return {
    ok: true,
    rootPath: rootReal,
    resolvedPath: targetReal,
    basename: pathImpl.basename(targetReal),
    fileUrl: toSafeFileUrl(targetReal, { pathImpl }),
  };
}

module.exports = {
  FANAL_DEFAULT_TARGET_URL,
  escapeHtml,
  parseAllowedTargetOrigin,
  isAllowedExternalUrl,
  isAllowedDrawerPopupUrl,
  isAllowedMainNavigation,
  isTrustedIpcSender,
  isValidSectorId,
  looksLikeBlockedUriScheme,
  isPathInsideRoot,
  toSafeFileUrl,
  canonicalizeFolderPath,
  resolveSandboxedFile,
};
