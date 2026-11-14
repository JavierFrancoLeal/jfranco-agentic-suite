#!/usr/bin/env node
// verify-app.mjs — cross-platform pre-DMG gate for the Fanal desktop app.
// Replaces the macOS-only shell version (sips/PlistBuddy/pkill) with Node
// builtins so it runs identically on macOS, Linux and Windows CI without
// electron-builder or a GUI.
//
// Usage:
//   node tools/verify-app.mjs [--skip-darwin-bundle]
//
// The darwin bundle check (PlistBuddy + "Le Veilleux" scan inside the built
// Fanal.app) is skipped automatically when the platform is not darwin, when
// --skip-darwin-bundle is passed, or when the bundle has not been built yet.

import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
} from "node:fs";
import { join, dirname, basename, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parityMismatches } from "./sync-desktop.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "apps", "desktop");
const BRAND = Buffer.from("Le Veilleux");

const failures = [];
function fail(msg) {
  failures.push(msg);
}

// Recursively list regular files under a directory.
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function containsBrand(file) {
  try {
    return readFileSync(file).includes(BRAND);
  } catch {
    return false;
  }
}

// --- 1. Icon chain: valid PNG at exactly 1024x1024 (no sips) ---
const iconPath = join(APP, "assets", "icon.png");
if (!existsSync(iconPath)) {
  fail("assets/icon.png missing");
} else {
  const buf = readFileSync(iconPath);
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIG)) {
    fail("assets/icon.png is not a valid PNG (bad signature)");
  } else {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    if (w !== 1024 || h !== 1024) {
      fail(`assets/icon.png must be 1024x1024 (got ${w}x${h})`);
    }
  }
}

// --- 2. package.json brand/build config ---
let pkg;
try {
  pkg = JSON.parse(readFileSync(join(APP, "package.json"), "utf8"));
} catch (e) {
  fail(`package.json unreadable: ${e.message}`);
  pkg = {};
}
const b = pkg.build || {};
if (b.productName !== "Fanal") fail('build.productName must be "Fanal"');
if (b.appId !== "ca.trasunto.fanal") fail('build.appId must be "ca.trasunto.fanal"');
if (b.mac?.icon !== "assets/icon.png") fail('build.mac.icon must be "assets/icon.png"');
if (!Array.isArray(b.mac?.target) || !b.mac.target.includes("dmg") || !b.mac.target.includes("zip")) {
  fail("build.mac.target must include dmg & zip");
}
if (!Array.isArray(b.win?.target) || !b.win.target.includes("nsis") || !b.win.target.includes("portable")) {
  fail("build.win.target must include nsis & portable");
}
if (typeof b.mac?.artifactName !== "string" || !b.mac.artifactName.startsWith("Fanal-")) {
  fail('build.mac.artifactName must start with "Fanal-"');
}
if (typeof b.win?.artifactName !== "string" || !b.win.artifactName.startsWith("Fanal-")) {
  fail('build.win.artifactName must start with "Fanal-"');
}
// allowScripts must match the locked Electron (45.3.0), never the stale 37.10.3.
const allow = pkg.allowScripts || {};
if (allow["electron@37.10.3"]) fail("allowScripts still references stale electron@37.10.3");
if (allow["electron@45.3.0"] !== true) fail('allowScripts missing "electron@45.3.0": true');

// --- 3. Zero old brand strings in the sources the app packs ---
const brandTargets = [
  join(APP, "main.js"),
  join(APP, "preload.js"),
  join(APP, "package.json"),
  join(APP, "welcome.html"),
  join(APP, "brain"),
  join(APP, "ui"),
];
for (const t of brandTargets) {
  const files = existsSync(t) && statSync(t).isDirectory() ? walk(t) : [t];
  for (const f of files) {
    if (/licen/i.test(basename(f))) continue; // license files may cite the old name
    if (containsBrand(f)) fail(`old brand "Le Veilleux" in ${relative(ROOT, f)}`);
  }
}

// --- 3b. The supervisor must be spawned with the app's own Electron node ---
const mainJs = readFileSync(join(APP, "main.js"), "utf8");
if (!mainJs.includes("process.execPath")) {
  fail("main.js does not spawn the supervisor via process.execPath");
}
if (!mainJs.includes("ELECTRON_RUN_AS_NODE")) {
  fail("main.js is missing ELECTRON_RUN_AS_NODE");
}
if (!mainJs.includes('brain.on("exit"')) {
  fail('main.js is missing the watchdog brain.on("exit")');
}
const brainServer = readFileSync(join(APP, "brain", "server.js"), "utf8");
if (!brainServer.includes("repondant/scan")) {
  fail("apps/desktop/brain/server.js is stale (missing repondant/scan) — run sync-desktop");
}

// --- 3c. Desktop bundle parity (same check sync-desktop.mjs --check runs) ---
for (const m of parityMismatches()) {
  fail(`bundle sync: ${m}`);
}

// --- 4. If the app was already built on macOS, verify the bundle too ---
const darwinBundle = join(APP, "dist", "mac-arm64", "Fanal.app");
const skipDarwin =
  process.argv.includes("--skip-darwin-bundle") ||
  process.platform !== "darwin" ||
  !existsSync(darwinBundle);
if (!skipDarwin) {
  const infoPlist = join(darwinBundle, "Contents", "Info.plist");
  const pb = spawnSync(
    "/usr/libexec/PlistBuddy",
    ["-c", "Print :CFBundleIconFile", infoPlist],
    { encoding: "utf8" },
  );
  if (pb.error) {
    fail(`PlistBuddy failed: ${pb.error.message}`);
  } else if (!String(pb.stdout).includes("icns")) {
    fail("CFBundleIconFile missing icns in built bundle");
  }
  const resources = join(darwinBundle, "Contents", "Resources");
  const hits = walk(resources).filter(containsBrand);
  if (hits.length) fail(`${hits.length} old-brand file(s) inside the built bundle`);
}

if (failures.length) {
  console.error("verify-app FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("verify-app PASSED — safe to run electron-builder");
