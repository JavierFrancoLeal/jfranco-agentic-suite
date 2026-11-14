#!/usr/bin/env node
// sync-desktop.mjs — keep the Electron desktop bundle's brain/ and ui/ copies
// byte-identical to the supervisor / ui / docs/sector-packs sources.
//
// This is the SINGLE source of truth for the desktop sync manifest. It is
// shared by tools/sync-all.sh, tools/bundle-sync-check.sh and
// tools/verify-app.mjs so the "lesson #17" drift (a brain/server.js older than
// the supervisor it serves) can never silently reappear.
//
// Usage:
//   node tools/sync-desktop.mjs            # sync (copy changed/missing files)
//   node tools/sync-desktop.mjs --check    # verify parity, exit 1 on drift
//
// Node builtins only; identical behavior on macOS / Linux / Windows.

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  statSync,
  existsSync,
} from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Shared manifest: every file the desktop bundle must mirror, as
// [source, destination] pairs relative to ROOT. No other file may keep a copy
// of this list.
const FILE_PAIRS = [
  ["supervisor/server.js", "apps/desktop/brain/server.js"],
  ["supervisor/dashboard.html", "apps/desktop/brain/dashboard.html"],
  ["supervisor/dashboard-i18n.js", "apps/desktop/brain/dashboard-i18n.js"],
  ["supervisor/browser-cdp.js", "apps/desktop/brain/browser-cdp.js"],
  ["ui/panel.html", "apps/desktop/ui/panel.html"],
  ["ui/manifest.webmanifest", "apps/desktop/ui/manifest.webmanifest"],
  ["ui/sw.js", "apps/desktop/ui/sw.js"],
];

// Directory groups: every matching file in srcDir is mirrored into dstDir.
const DIR_GROUPS = [
  { srcDir: "ui/icons", dstDir: "apps/desktop/ui/icons", filter: () => true },
  {
    srcDir: "docs/sector-packs",
    dstDir: "apps/desktop/brain/sector-packs",
    filter: (name) => name.endsWith(".json"),
  },
];

// Expand the manifest into concrete absolute [src, dst] file pairs.
function entries() {
  const list = [];
  for (const [src, dst] of FILE_PAIRS) {
    list.push([join(ROOT, src), join(ROOT, dst)]);
  }
  for (const { srcDir, dstDir, filter } of DIR_GROUPS) {
    const srcAbs = join(ROOT, srcDir);
    const dstAbs = join(ROOT, dstDir);
    if (!existsSync(srcAbs)) continue;
    for (const name of readdirSync(srcAbs)) {
      if (!filter(name)) continue;
      if (!statSync(join(srcAbs, name)).isFile()) continue;
      list.push([join(srcAbs, name), join(dstAbs, name)]);
    }
  }
  return list;
}

// Byte-for-byte equality; a missing destination is never equal.
function sameBytes(src, dst) {
  if (!existsSync(dst)) return false;
  const a = readFileSync(src);
  const b = readFileSync(dst);
  return a.length === b.length && a.equals(b);
}

// Parity check (shared with tools/verify-app.mjs). Returns a list of
// human-readable mismatch descriptions; an empty list means the desktop bundle
// is fully in sync with the sources.
export function parityMismatches() {
  const mismatches = [];
  for (const [src, dst] of entries()) {
    const rel = relative(ROOT, dst);
    if (!existsSync(dst)) {
      mismatches.push(`MISSING  ${rel} (expected copy of ${relative(ROOT, src)})`);
    } else if (!sameBytes(src, dst)) {
      mismatches.push(`DIFFERS  ${rel} (stale vs ${relative(ROOT, src)})`);
    }
  }
  return mismatches;
}

// Sync: copy only changed or missing files, never touching unchanged mtimes.
function sync() {
  const copied = [];
  for (const [src, dst] of entries()) {
    if (sameBytes(src, dst)) continue;
    mkdirSync(dirname(dst), { recursive: true });
    writeFileSync(dst, readFileSync(src));
    copied.push(relative(ROOT, dst));
  }
  return copied;
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function main() {
  if (process.argv.includes("--check")) {
    const mismatches = parityMismatches();
    if (mismatches.length === 0) {
      console.log("DESKTOP BUNDLE SYNC PASSED: app bundle in step with sources");
      process.exit(0);
    }
    for (const m of mismatches) console.error(m);
    console.error("DESKTOP BUNDLE SYNC FAILED: run `node tools/sync-desktop.mjs` to fix");
    process.exit(1);
  }

  const copied = sync();
  if (copied.length === 0) {
    console.log("desktop bundle already in sync (no files changed)");
  } else {
    console.log(`desktop bundle synced: ${copied.length} file(s) updated`);
    for (const p of copied) console.log(`  ${p}`);
  }
}

if (isMain) main();
