#!/usr/bin/env node
// build-editions.mjs — builds isolated Fanal (End-User) and Fanal Studio (Creator) packages.
// Keeps apps/desktop/edition.json strictly pinned to "client" in the repo by staging
// Fanal Studio builds in an isolated temporary directory before invoking electron-builder.

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = join(ROOT, "apps", "desktop");

function parseArgs(argv) {
  let edition = "client";
  let all = false;
  let dirOnly = false;
  let noRuntime = false;
  const passthrough = [];

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--all") {
      all = true;
    } else if (a === "--edition") {
      edition = String(argv[i + 1] || "client").trim().toLowerCase();
      i += 1;
    } else if (a.startsWith("--edition=")) {
      edition = a.split("=", 2)[1].trim().toLowerCase();
    } else if (a === "--dir" || a === "--packed") {
      dirOnly = true;
    } else if (a === "--no-runtime") {
      noRuntime = true;
    } else {
      passthrough.push(a);
    }
  }
  const targets = all ? ["client", "studio"] : [edition];
  for (const t of targets) {
    if (t !== "client" && t !== "studio") {
      throw new Error(`Unsupported edition "${t}". Expected "client" or "studio".`);
    }
  }
  return { targets, dirOnly, noRuntime, passthrough };
}

function resolveBuilderCli() {
  const req = createRequire(join(APP_DIR, "package.json"));
  const pkgJsonPath = req.resolve("electron-builder/package.json");
  return join(dirname(pkgJsonPath), "cli.js");
}

function defaultPlatformFlags(passthrough) {
  const flags = [];
  const hasPlatform = passthrough.some((f) => f === "--mac" || f === "--win" || f === "--linux");
  if (!hasPlatform) {
    flags.push(process.platform === "darwin" ? "--mac" : process.platform === "win32" ? "--win" : "--linux");
  }
  const hasArch = passthrough.some((f) => f === "--arm64" || f === "--x64" || f === "--universal");
  if (!hasArch) {
    flags.push(process.arch === "arm64" ? "--arm64" : "--x64");
  }
  return flags;
}

function runBuilder(projectDir, extraArgs) {
  const builderCli = resolveBuilderCli();
  const buildEnv = { ...process.env };
  if (!buildEnv.CSC_LINK) buildEnv.CSC_IDENTITY_AUTO_DISCOVERY = "false";
  delete buildEnv.ELECTRON_RUN_AS_NODE;
  delete buildEnv.ELECTRON_RUN_AS_NODE_POLL;

  const args = [builderCli, ...extraArgs];
  console.log(`build-editions: running electron-builder in ${projectDir} (${extraArgs.join(" ")})`);
  const res = spawnSync(process.execPath, args, {
    cwd: projectDir,
    env: buildEnv,
    stdio: "inherit",
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`electron-builder exited with code ${res.status}`);
  }
}

function assertSyncClean() {
  const syncScript = join(ROOT, "tools", "sync-desktop.mjs");
  const r = spawnSync(process.execPath, [syncScript, "--check-all"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (r.status !== 0) {
    throw new Error(`sync-desktop --check-all failed before build:\n${r.stdout || ""}\n${r.stderr || ""}`.trim());
  }
}

function buildClient({ dirOnly, noRuntime, passthrough }) {
  const edPath = join(APP_DIR, "edition.json");
  const ed = JSON.parse(readFileSync(edPath, "utf8"));
  if (ed.edition !== "client") {
    throw new Error(`Repo edition.json must remain "client" (found "${ed.edition}")`);
  }
  const args = [...defaultPlatformFlags(passthrough), ...passthrough];
  if (dirOnly) args.push("--dir");
  if (noRuntime) args.push("-c.extraResources=[]");
  if (!process.env.CSC_LINK && process.platform === "darwin" && !args.some((a) => a.startsWith("-c.mac.identity"))) {
    args.push("-c.mac.identity=null");
  }
  if (!process.env.CSC_LINK && process.platform === "win32" && !args.some((a) => a.startsWith("-c.win.signAndEditExecutable"))) {
    args.push("-c.win.signAndEditExecutable=false");
  }
  runBuilder(APP_DIR, args);
}

function buildStudio({ dirOnly, noRuntime, passthrough }) {
  const stageDir = mkdtempSync(join(tmpdir(), "fanal-studio-stage-"));
  const outDir = join(APP_DIR, "dist", "studio");
  mkdirSync(outDir, { recursive: true });

  try {
    cpSync(APP_DIR, stageDir, {
      recursive: true,
      filter: (src) => {
        const rel = src.slice(APP_DIR.length);
        if (!rel) return true;
        if (rel === "/dist" || rel.startsWith("/dist/")) return false;
        if (rel === "\\dist" || rel.startsWith("\\dist\\")) return false;
        if (rel === "/node_modules" || rel.startsWith("/node_modules/")) return false;
        if (rel === "\\node_modules" || rel.startsWith("\\node_modules\\")) return false;
        return true;
      },
    });

    const nmTarget = join(APP_DIR, "node_modules");
    const nmLink = join(stageDir, "node_modules");
    if (existsSync(nmTarget) && !existsSync(nmLink)) {
      symlinkSync(nmTarget, nmLink, process.platform === "win32" ? "junction" : "dir");
    }

    writeFileSync(
      join(stageDir, "edition.json"),
      JSON.stringify(
        {
          edition: "studio",
          appId: "ca.trasunto.fanal.studio",
          productName: "Fanal Studio",
        },
        null,
        2,
      ) + "\n",
    );

    const pkgPath = join(stageDir, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    pkg.name = "fanal-studio-desktop";
    pkg.build = pkg.build || {};
    pkg.build.appId = "ca.trasunto.fanal.studio";
    pkg.build.productName = "Fanal Studio";
    pkg.build.directories = { ...(pkg.build.directories || {}), output: outDir };
    pkg.build.mac = {
      ...(pkg.build.mac || {}),
      icon: "assets/icon-studio.png",
      artifactName: "Fanal-Studio-${version}-${arch}.${ext}",
    };
    pkg.build.win = {
      ...(pkg.build.win || {}),
      icon: "assets/icon-studio.png",
      artifactName: "Fanal-Studio-${version}-${arch}.${ext}",
    };
    pkg.build.linux = {
      ...(pkg.build.linux || {}),
      icon: "assets/icon-studio.png",
    };
    pkg.build.nsis = {
      ...(pkg.build.nsis || {}),
      shortcutName: "Fanal Studio",
    };
    if (noRuntime) {
      pkg.build.extraResources = [];
    } else if (Array.isArray(pkg.build.extraResources)) {
      pkg.build.extraResources = pkg.build.extraResources
        .map((entry) => {
          if (typeof entry === "object" && entry && entry.from) {
            const absFrom = resolve(APP_DIR, entry.from);
            return existsSync(absFrom) ? { ...entry, from: absFrom } : null;
          }
          return entry;
        })
        .filter(Boolean);
    }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

    const args = [...defaultPlatformFlags(passthrough), ...passthrough];
    if (dirOnly) args.push("--dir");
    if (!process.env.CSC_LINK && process.platform === "darwin" && !args.some((a) => a.startsWith("-c.mac.identity"))) {
      args.push("-c.mac.identity=null");
    }
    if (!process.env.CSC_LINK && process.platform === "win32" && !args.some((a) => a.startsWith("-c.win.signAndEditExecutable"))) {
      args.push("-c.win.signAndEditExecutable=false");
    }
    runBuilder(stageDir, args);
  } finally {
    try {
      rmSync(stageDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
    } catch {}
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  assertSyncClean();
  for (const target of opts.targets) {
    if (target === "client") buildClient(opts);
    else buildStudio(opts);
  }
  console.log(`build-editions: completed (${opts.targets.join(", ")})`);
}

main();
