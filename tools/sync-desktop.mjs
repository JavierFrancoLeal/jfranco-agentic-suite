#!/usr/bin/env node
// sync-desktop.mjs — single canonical sync manifest for Fanal bundles.
// Keeps both apps/desktop/{brain,ui}/ and supervisor-pkg/ byte-identical to
// supervisor/, ui/, and docs/sector-packs/, and guards supervisor-pkg/package.json
// against missing relative server.js module imports or recursive directory copies.
//
// Shared by tools/sync-all.sh, tools/sync-check.sh, tools/bundle-sync-check.sh,
// tools/check.sh, tools/check.ps1 and tools/verify-app.mjs so bundle drift or
// MODULE_NOT_FOUND crashes in @javierfrancoleal/dsh-supervisor cannot recur.
//
// Usage:
//   node tools/sync-desktop.mjs                     # sync apps/desktop/
//   node tools/sync-desktop.mjs --check             # check apps/desktop/
//   node tools/sync-desktop.mjs --supervisor-pkg    # sync supervisor-pkg/
//   node tools/sync-desktop.mjs --check-supervisor-pkg
//   node tools/sync-desktop.mjs --all               # sync both targets
//   node tools/sync-desktop.mjs --check-all         # check both targets
//
// Node builtins only; identical behavior on macOS / Linux / Windows.

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  statSync,
  existsSync,
  rmSync,
} from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Canonical list of runtime/UI source files under supervisor/ required by server.js.
const SUPERVISOR_FILES = [
  "server.js",
  "edition.js",
  "brain-catalog.js",
  "diagnostic-sanitizer.js",
  "power-kpi.js",
  "intake-engine.js",
  "quebec-profiles.js",
  "setup-validator.js",
  "usage-telemetry.js",
  "pricing-catalog.json",
  "affluence-forecast.js",
  "multimodal-bridge.js",
  "dashboard.html",
  "dashboard-i18n.js",
  "browser-cdp.js",
];

function buildTargetSpec(brainDir, uiDir, sectorDir, includeSw) {
  const filePairs = [
    ...SUPERVISOR_FILES.map((f) => [join("supervisor", f), join(brainDir, f)]),
    ["ui/panel.html", join(uiDir, "panel.html")],
    ["ui/manifest.webmanifest", join(uiDir, "manifest.webmanifest")],
  ];
  if (includeSw) filePairs.push(["ui/sw.js", join(uiDir, "sw.js")]);
  const dirGroups = [
    { srcDir: "ui/icons", dstDir: join(uiDir, "icons"), filter: () => true },
    {
      srcDir: "docs/sector-packs",
      dstDir: sectorDir,
      filter: (name) => name.endsWith(".json"),
    },
  ];
  return { filePairs, dirGroups };
}

const TARGETS = {
  desktop: {
    label: "desktop bundle",
    passMessage: "DESKTOP BUNDLE SYNC PASSED: app bundle in step with sources",
    failHint: "run `node tools/sync-desktop.mjs` to fix",
    ...buildTargetSpec(
      "apps/desktop/brain",
      "apps/desktop/ui",
      "apps/desktop/brain/sector-packs",
      true
    ),
  },
  "supervisor-pkg": {
    label: "supervisor-pkg",
    passMessage: "SUPERVISOR PKG SYNC PASSED: package files in step with sources",
    failHint: "run `node tools/sync-desktop.mjs --supervisor-pkg` to fix",
    checkPkgManifest: true,
    ...buildTargetSpec(
      "supervisor-pkg",
      "supervisor-pkg",
      "supervisor-pkg/sector-packs",
      true
    ),
  },
};

// Expand a target spec into concrete absolute [src, dst] file pairs plus
// expected relative filenames inside each mirrored directory group.
function entriesFor(spec) {
  const list = [];
  const expectedDirs = [];
  for (const [src, dst] of spec.filePairs) {
    list.push([join(ROOT, src), join(ROOT, dst)]);
  }
  for (const { srcDir, dstDir, filter } of spec.dirGroups) {
    const srcAbs = join(ROOT, srcDir);
    const dstAbs = join(ROOT, dstDir);
    const expectedNames = new Set();
    expectedDirs.push({ dstAbs, expectedNames });
    if (!existsSync(srcAbs)) continue;
    for (const name of readdirSync(srcAbs)) {
      if (!filter(name)) continue;
      if (!statSync(join(srcAbs, name)).isFile()) continue;
      expectedNames.add(name);
      list.push([join(srcAbs, name), join(dstAbs, name)]);
    }
  }
  return { list, expectedDirs };
}

// Byte-for-byte equality; a missing destination is never equal.
function sameBytes(src, dst) {
  if (!existsSync(dst)) return false;
  const a = readFileSync(src);
  const b = readFileSync(dst);
  return a.length === b.length && a.equals(b);
}

// Validate supervisor-pkg/package.json files whitelist and module completeness.
function supervisorPkgManifestMismatches() {
  const mismatches = [];
  const pkgPath = join(ROOT, "supervisor-pkg", "package.json");
  if (!existsSync(pkgPath)) {
    return ["MISSING  supervisor-pkg/package.json"];
  }
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch (e) {
    return [`INVALID  supervisor-pkg/package.json (${e.message})`];
  }
  const declaredFiles = new Set(Array.isArray(pkg.files) ? pkg.files : []);
  for (const f of [...SUPERVISOR_FILES, "panel.html", "manifest.webmanifest", "sw.js"]) {
    if (!declaredFiles.has(f)) {
      mismatches.push(`PKG-FILES supervisor-pkg/package.json missing "${f}" in files[]`);
    }
  }
  const serverSrc = readFileSync(join(ROOT, "supervisor", "server.js"), "utf8");
  for (const m of serverSrc.matchAll(/require\(\s*["'](\.[^"']+)["']\s*\)/g)) {
    const rel = m[1].replace(/^\.\//, "");
    const fname = rel.endsWith(".js") ? rel : `${rel}.js`;
    if (!existsSync(join(ROOT, "supervisor-pkg", fname))) {
      mismatches.push(`MISSING  supervisor-pkg/${fname} (required by server.js)`);
    }
    if (!declaredFiles.has(fname)) {
      mismatches.push(`PKG-FILES supervisor-pkg/package.json missing required module "${fname}"`);
    }
  }
  return mismatches;
}

// Parity check (shared with tools/verify-app.mjs). Defaults to "desktop".
export function parityMismatches(targetName = "desktop") {
  const spec = TARGETS[targetName];
  if (!spec) throw new Error(`Unknown sync target: ${targetName}`);
  const mismatches = [];
  const { list, expectedDirs } = entriesFor(spec);
  for (const [src, dst] of list) {
    const rel = relative(ROOT, dst);
    if (!existsSync(dst)) {
      mismatches.push(`MISSING  ${rel} (expected copy of ${relative(ROOT, src)})`);
    } else if (!sameBytes(src, dst)) {
      mismatches.push(`DIFFERS  ${rel} (stale vs ${relative(ROOT, src)})`);
    }
  }
  for (const { dstAbs, expectedNames } of expectedDirs) {
    if (!existsSync(dstAbs)) continue;
    for (const name of readdirSync(dstAbs)) {
      if (!expectedNames.has(name)) {
        mismatches.push(`ORPHAN   ${relative(ROOT, join(dstAbs, name))} (not in source dir)`);
      }
    }
  }
  if (spec.checkPkgManifest) {
    mismatches.push(...supervisorPkgManifestMismatches());
  }
  return mismatches;
}

// Sync: copy only changed/missing files and prune orphans in mirrored dirGroups.
function syncTarget(targetName) {
  const spec = TARGETS[targetName];
  const copied = [];
  const { list, expectedDirs } = entriesFor(spec);
  for (const [src, dst] of list) {
    if (sameBytes(src, dst)) continue;
    mkdirSync(dirname(dst), { recursive: true });
    writeFileSync(dst, readFileSync(src));
    copied.push(relative(ROOT, dst));
  }
  for (const { dstAbs, expectedNames } of expectedDirs) {
    if (!existsSync(dstAbs)) continue;
    for (const name of readdirSync(dstAbs)) {
      if (!expectedNames.has(name)) {
        const orphan = join(dstAbs, name);
        rmSync(orphan, { recursive: true, force: true });
        copied.push(`removed orphan ${relative(ROOT, orphan)}`);
      }
    }
  }
  return copied;
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function main() {
  const args = new Set(process.argv.slice(2));
  const checkMode =
    args.has("--check") || args.has("--check-supervisor-pkg") || args.has("--check-all");

  const selectedTargets = [];
  if (args.has("--all") || args.has("--check-all")) {
    selectedTargets.push("desktop", "supervisor-pkg");
  } else {
    if (args.has("--supervisor-pkg") || args.has("--check-supervisor-pkg")) {
      selectedTargets.push("supervisor-pkg");
    }
    if (args.has("--check") || (!args.has("--supervisor-pkg") && !args.has("--check-supervisor-pkg"))) {
      selectedTargets.push("desktop");
    }
  }

  if (checkMode) {
    let anyFailed = false;
    for (const targetName of selectedTargets) {
      const spec = TARGETS[targetName];
      const mismatches = parityMismatches(targetName);
      if (mismatches.length === 0) {
        console.log(spec.passMessage);
      } else {
        anyFailed = true;
        for (const m of mismatches) console.error(m);
        console.error(
          `${targetName.toUpperCase()} SYNC FAILED: ${spec.failHint}`
        );
      }
    }
    process.exit(anyFailed ? 1 : 0);
  }

  for (const targetName of selectedTargets) {
    const spec = TARGETS[targetName];
    const copied = syncTarget(targetName);
    if (copied.length === 0) {
      console.log(`${spec.label} already in sync (no files changed)`);
    } else {
      console.log(`${spec.label} synced: ${copied.length} file(s) updated`);
      for (const p of copied) console.log(`  ${p}`);
    }
  }
}

if (isMain) main();
