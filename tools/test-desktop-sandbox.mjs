#!/usr/bin/env node
// test-desktop-sandbox.mjs — cross-platform unit & regression tests for Fanal Desktop's
// URL allowlists, origin navigation/IPC sender locks, folder containment, Windows file://
// conversion, symlink escape defense, and main/preload security wiring.

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path, { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(import.meta.url);
const sb = req(join(ROOT, "apps", "desktop", "desktop-sandbox.js"));

const {
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
} = sb;

function run() {
  // 1. HTML escaping prevents apostrophe attribute breakout (e.g. French filenames)
  assert.equal(escapeHtml(`a'b"c<d>&e`), "a&#39;b&quot;c&lt;d&gt;&amp;e");

  // 2. External & drawer URL allowlists block dangerous schemes and host-prefix spoofs
  assert.equal(isAllowedExternalUrl("https://www.revenuquebec.ca/en/"), true);
  assert.equal(isAllowedExternalUrl("http://127.0.0.1:8787/dashboard"), true);
  for (const bad of [
    "",
    null,
    "file:///etc/passwd",
    "FILE:///C:/Windows/win.ini",
    "ms-msdt:id PCWDiagnostic",
    "smb://evil.local/share",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
  ]) {
    assert.equal(isAllowedExternalUrl(bad), false, `must reject external URL: ${String(bad)}`);
  }

  assert.equal(isAllowedDrawerPopupUrl("https://canada.ca/taxes"), true);
  assert.equal(isAllowedDrawerPopupUrl("http://127.0.0.1:8787/sub"), true);
  assert.equal(isAllowedDrawerPopupUrl("http://localhost:8787/sub"), true);
  assert.equal(isAllowedDrawerPopupUrl("http://127.0.0.1.attacker.com/steal"), false);
  assert.equal(isAllowedDrawerPopupUrl("http://example.com/plain"), false);

  // 3. Target origin parsing & main-window navigation / IPC sender trust checks
  const def = parseAllowedTargetOrigin("file:///etc/passwd");
  assert.equal(def.url, FANAL_DEFAULT_TARGET_URL);
  assert.equal(def.origin, "http://127.0.0.1:8787");
  assert.equal(def.isLocal, true);

  const lan = parseAllowedTargetOrigin("https://fanal.cabinet.local:9443/dashboard");
  assert.equal(lan.origin, "https://fanal.cabinet.local:9443");
  assert.equal(lan.port, 9443);
  assert.equal(lan.isLocal, false);

  const ipv6 = parseAllowedTargetOrigin("http://[::1]:8787/dashboard");
  assert.equal(ipv6.host, "::1");
  assert.equal(ipv6.isLocal, true);

  assert.equal(isAllowedMainNavigation("http://127.0.0.1:8787/dashboard?lang=fr", def.origin), true);
  assert.equal(isAllowedMainNavigation("http://127.0.0.1:8788/dashboard", def.origin), false);
  assert.equal(isAllowedMainNavigation("https://127.0.0.1:8787/dashboard", def.origin), false);
  assert.equal(isAllowedMainNavigation("http://127.0.0.1:8787.evil.com/", def.origin), false);
  assert.equal(isAllowedMainNavigation("data:text/html,hello", def.origin), false);
  assert.equal(isAllowedMainNavigation("https://evil.example/", def.origin), false);

  assert.equal(isTrustedIpcSender({ senderMatchesPrimary: true, senderUrl: "http://127.0.0.1:8787/dashboard", targetOrigin: def.origin }), true);
  assert.equal(isTrustedIpcSender({ senderMatchesPrimary: false, senderUrl: "http://127.0.0.1:8787/dashboard", targetOrigin: def.origin }), false);
  assert.equal(isTrustedIpcSender({ senderMatchesPrimary: true, senderUrl: "data:text/html,err", targetOrigin: def.origin }), false);
  assert.equal(isTrustedIpcSender({ senderMatchesPrimary: true, senderUrl: "https://evil.example/", targetOrigin: def.origin }), false);

  // 4. Sector ID validation & Windows drive vs URI scheme distinction
  assert.equal(isValidSectorId("tax-quebec_2026"), true);
  assert.equal(isValidSectorId("../../etc/passwd"), false);
  assert.equal(isValidSectorId("foo/bar"), false);
  assert.equal(isValidSectorId(""), false);

  assert.equal(looksLikeBlockedUriScheme("file:///etc/passwd"), true);
  assert.equal(looksLikeBlockedUriScheme("ms-msdt:id"), true);
  assert.equal(looksLikeBlockedUriScheme("C:\\Cases\\Client 1\\doc.pdf"), false);
  assert.equal(looksLikeBlockedUriScheme("c:/Cases/doc.pdf"), false);

  // 5. Real filesystem sandbox containment, sibling-prefix trap, Windows-like apostrophes, and symlink escape
  const baseTmp = mkdtempSync(join(tmpdir(), "fanal-sandbox-test-"));
  try {
    const client1 = join(baseTmp, "client-1");
    const client10 = join(baseTmp, "client-10");
    const sub = join(client1, "sub");
    mkdirSync(sub, { recursive: true });
    mkdirSync(client10, { recursive: true });

    const validFile = join(client1, "Reçu #1's.pdf");
    const subFile = join(sub, "notes.txt");
    const siblingFile = join(client10, "secret.pdf");
    writeFileSync(validFile, "%PDF-1.4\n");
    writeFileSync(subFile, "ok\n");
    writeFileSync(siblingFile, "TOP_SECRET\n");

    const canon = canonicalizeFolderPath(client1);
    assert.equal(canon.ok, true);
    assert.equal(canon.activeFolderChip, "client-1");

    // Fail closed when allowedClientFolder is unset / invalid
    assert.equal(resolveSandboxedFile(null, validFile).ok, false);
    assert.equal(resolveSandboxedFile("", validFile).ok, false);
    assert.equal(resolveSandboxedFile(validFile, "Reçu #1's.pdf").ok, false);

    // Valid basenameOnly step file inside connected folder
    const stepOk = resolveSandboxedFile(client1, "Reçu #1's.pdf", { basenameOnly: true });
    assert.equal(stepOk.ok, true);
    assert.ok(stepOk.fileUrl.startsWith("file:///"));
    assert.ok(stepOk.fileUrl.includes("%231"), "hash must be URL-encoded");
    assert.ok(!escapeHtml(stepOk.fileUrl).includes("'"), "apostrophe must be HTML-escaped in attributes");

    // Traversal & subdirectory rejection in basenameOnly mode
    for (const badStep of ["../client-10/secret.pdf", "..\\..\\secret.pdf", "sub/notes.txt", ".", "..", ""]) {
      assert.equal(resolveSandboxedFile(client1, badStep, { basenameOnly: true }).status, "FNL-SANDBOX-502");
    }

    // Drawer mode: relative & absolute paths inside folder work; sibling & schemes fail closed
    assert.equal(resolveSandboxedFile(canon.resolvedPath, "sub/notes.txt").ok, true);
    assert.equal(resolveSandboxedFile(client1, subFile).ok, true);
    assert.equal(resolveSandboxedFile(client1, siblingFile).status, "FNL-SANDBOX-502");
    assert.equal(resolveSandboxedFile(client1, client1).status, "FNL-SANDBOX-502");
    assert.equal(resolveSandboxedFile(client1, "file:///etc/passwd").status, "FNL-SANDBOX-502");
    assert.equal(resolveSandboxedFile(client1, join(client1, "missing.pdf")).status, "FNL-SANDBOX-502");

    // Symlink escaping connected folder must fail closed
    const linkPath = join(client1, "escape.pdf");
    let createdLink = false;
    try {
      symlinkSync(siblingFile, linkPath);
      createdLink = true;
    } catch (e) {
      if (e.code !== "EPERM" && e.code !== "ENOTSUP") throw e;
    }
    if (createdLink) {
      const symRes = resolveSandboxedFile(client1, linkPath);
      assert.equal(symRes.ok, false);
      assert.equal(symRes.status, "FNL-SANDBOX-502");
    }
  } finally {
    rmSync(baseTmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }

  // 6. Cross-platform synthetic Win32 containment & file:///C:/ URL tests (runs on macOS/Linux/Win)
  assert.equal(isPathInsideRoot("C:\\Cases\\client-1", "C:\\Cases\\client-10\\secret.pdf", { pathImpl: path.win32 }), false);
  assert.equal(isPathInsideRoot("C:\\Cases\\client-1", "D:\\Secret\\doc.pdf", { pathImpl: path.win32 }), false);
  assert.equal(isPathInsideRoot("C:\\Cases\\client-1", "C:\\Cases\\client-1\\sub\\doc.pdf", { pathImpl: path.win32 }), true);

  const winRoot = "C:\\Cases\\Client 1";
  const winFile = "C:\\Cases\\Client 1\\Reçu #1.pdf";
  const winResolveOk = resolveSandboxedFile(winRoot, winFile, {
    pathImpl: path.win32,
    statSync: (p) => ({
      isDirectory: () => p === winRoot,
      isFile: () => p === winFile,
    }),
    realpathSync: (p) => p,
  });
  assert.equal(winResolveOk.ok, true);
  assert.equal(winResolveOk.fileUrl, "file:///C:/Cases/Client%201/Re%C3%A7u%20%231.pdf");

  const winSymlinkEscape = resolveSandboxedFile(winRoot, "C:\\Cases\\Client 1\\link.pdf", {
    pathImpl: path.win32,
    statSync: () => ({ isDirectory: () => true, isFile: () => true }),
    realpathSync: (p) => (p.endsWith("link.pdf") ? "C:\\Cases\\Client 10\\secret.pdf" : p),
  });
  assert.equal(winSymlinkEscape.ok, false);
  assert.equal(winSymlinkEscape.status, "FNL-SANDBOX-502");

  // POSIX pathToFileURL / toSafeFileUrl check for macOS/Linux drive equivalence
  assert.ok(toSafeFileUrl("C:\\Cases\\a b.pdf", { pathImpl: path.win32 }) === "file:///C:/Cases/a%20b.pdf");

  // 7. Regression assertions on main.js and preload.js wiring
  const mainSrc = readFileSync(join(ROOT, "apps", "desktop", "main.js"), "utf8");
  const preloadSrc = readFileSync(join(ROOT, "apps", "desktop", "preload.js"), "utf8");
  assert.equal(mainSrc.includes('"file://" +'), false, "main.js must use pathToFileURL instead of string concat");
  assert.equal(/\bfsx\b/.test(mainSrc), false, "main.js must not keep duplicate fsx alias");
  assert.equal(mainSrc.includes("runAgenticTaskInRightDrawer"), false, "dead debugger function must stay removed");
  assert.ok(mainSrc.includes("monitor2Window.setContentProtection(true)"), "monitor2Window must enable content protection");
  assert.ok(mainSrc.includes("secondMonitorWindow.setContentProtection(true)"), "secondMonitorWindow must enable content protection");
  assert.ok(mainSrc.includes("!isTrustedIpcEvent(ev) || !firstRun()"), "leveilleux-setup must enforce trusted origin + firstRun()");
  assert.ok(mainSrc.includes('on("will-navigate"') && mainSrc.includes('on("will-redirect"'), "main window must lock navigation & redirects");
  assert.ok(preloadSrc.includes('window.location.protocol === "http:" || window.location.protocol === "https:"'), "preload must gate bridges behind http/https origins");

  console.log("DESKTOP_SANDBOX_TESTS PASSED");
}

run();
