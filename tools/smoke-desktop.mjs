#!/usr/bin/env node
// smoke-desktop.mjs — cross-platform Electron launch smoke test for Fanal.
// Spawns the desktop Electron app (either source workspace or `--packed` via
// `electron-builder --dir`) against an isolated temp data directory and
// ephemeral localhost port with LE_VEILLEUX_SMOKE=1, asserts exit 0 + "SMOKE OK",
// and cleans up without touching ~/.dsh or apps/desktop/dist.
//
// Usage:
//   node tools/smoke-desktop.mjs            # fast source-mode Electron smoke
//   node tools/smoke-desktop.mjs --packed   # ASAR + app.asar.unpacked smoke

import { mkdtempSync, rmSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { spawn, spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = join(ROOT, "apps", "desktop");
const PACKED = process.argv.includes("--packed");
const TIMEOUT_MS = Number(process.env.FANAL_SMOKE_TIMEOUT_MS || (PACKED ? 60000 : 35000));
const BUILD_TIMEOUT_MS = Number(process.env.FANAL_PACK_TIMEOUT_MS || 420000);

function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close((err) => (err ? reject(err) : resolvePort(port)));
    });
  });
}

function resolveElectronBin() {
  const req = createRequire(join(APP_DIR, "package.json"));
  const bin = req("electron");
  if (typeof bin !== "string" || !bin) {
    throw new Error("Could not resolve electron binary from apps/desktop/package.json");
  }
  return bin;
}

function resolveBuilderCli() {
  const req = createRequire(join(APP_DIR, "package.json"));
  const pkgJsonPath = req.resolve("electron-builder/package.json");
  return join(dirname(pkgJsonPath), "cli.js");
}

function assertExists(targetPath, label) {
  if (!existsSync(targetPath)) {
    throw new Error(`Packed resource missing (${label}): ${targetPath}`);
  }
}

function locatePackedApp(packOutDir) {
  if (process.platform === "darwin") {
    const candidates = [
      join(packOutDir, `mac-${process.arch}`, "Fanal.app"),
      join(packOutDir, "mac-arm64", "Fanal.app"),
      join(packOutDir, "mac", "Fanal.app"),
    ];
    const appBundle = candidates.find((p) => existsSync(p));
    if (!appBundle) throw new Error(`Packed Fanal.app not found under ${packOutDir}`);
    return {
      execPath: join(appBundle, "Contents", "MacOS", "Fanal"),
      cwd: join(appBundle, "Contents", "MacOS"),
      resourcesDir: join(appBundle, "Contents", "Resources"),
    };
  }
  if (process.platform === "win32") {
    const unpackedDir = join(packOutDir, "win-unpacked");
    if (!existsSync(unpackedDir)) throw new Error(`Packed win-unpacked not found under ${packOutDir}`);
    const exe = ["Fanal.exe", "electron.exe"].map((n) => join(unpackedDir, n)).find((p) => existsSync(p));
    if (!exe) throw new Error(`Packed Windows executable not found in ${unpackedDir}`);
    return {
      execPath: exe,
      cwd: unpackedDir,
      resourcesDir: join(unpackedDir, "resources"),
    };
  }
  const unpackedDir = join(packOutDir, "linux-unpacked");
  if (!existsSync(unpackedDir)) throw new Error(`Packed linux-unpacked not found under ${packOutDir}`);
  const bin = ["Fanal", "fanal-desktop", "electron"].map((n) => join(unpackedDir, n)).find((p) => existsSync(p));
  if (!bin) throw new Error(`Packed Linux executable not found in ${unpackedDir}`);
  return {
    execPath: bin,
    cwd: unpackedDir,
    resourcesDir: join(unpackedDir, "resources"),
  };
}

function buildPackedDir(packOutDir) {
  const builderCli = resolveBuilderCli();
  const platformFlag = process.platform === "darwin" ? "--mac" : process.platform === "win32" ? "--win" : "--linux";
  const archFlag = process.arch === "arm64" ? "--arm64" : "--x64";
  const args = [
    builderCli,
    platformFlag,
    archFlag,
    "--dir",
    "--projectDir",
    APP_DIR,
    `-c.directories.output=${packOutDir}`,
    "-c.extraResources=[]",
    "-c.compression=store",
    "-c.npmRebuild=false",
  ];
  if (process.platform === "darwin") args.push("-c.mac.identity=null");
  if (process.platform === "win32") args.push("-c.win.signAndEditExecutable=false");

  const buildEnv = { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: "false" };
  delete buildEnv.ELECTRON_RUN_AS_NODE;
  delete buildEnv.ELECTRON_RUN_AS_NODE_POLL;

  console.log(`smoke-desktop: packing unpacked bundle (${platformFlag} ${archFlag}) into temp dir...`);
  const res = spawnSync(process.execPath, args, {
    cwd: APP_DIR,
    env: buildEnv,
    encoding: "utf8",
    timeout: BUILD_TIMEOUT_MS,
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`electron-builder --dir failed (exit=${res.status}):\n${res.stdout || ""}\n${res.stderr || ""}`.trim());
  }

  const located = locatePackedApp(packOutDir);
  assertExists(located.execPath, "executable");
  assertExists(join(located.resourcesDir, "app.asar"), "app.asar");
  const unpackedDir = join(located.resourcesDir, "app.asar.unpacked");
  assertExists(join(unpackedDir, "brain", "server.js"), "app.asar.unpacked/brain/server.js");
  assertExists(join(unpackedDir, "brain", "diagnostic-sanitizer.js"), "app.asar.unpacked/brain/diagnostic-sanitizer.js");
  assertExists(join(unpackedDir, "ui", "panel.html"), "app.asar.unpacked/ui/panel.html");
  const packsDir = join(unpackedDir, "brain", "sector-packs");
  assertExists(packsDir, "app.asar.unpacked/brain/sector-packs");
  const packJsons = readdirSync(packsDir).filter((f) => f.endsWith(".json"));
  if (!packJsons.length) throw new Error("Packed sector-packs directory contains no .json files");

  // Confirm ELECTRON_RUN_AS_NODE executes syntax check on unpacked brain server directly
  const nodeCheck = spawnSync(located.execPath, ["--check", join(unpackedDir, "brain", "server.js")], {
    cwd: located.cwd,
    env: { ...buildEnv, ELECTRON_RUN_AS_NODE: "1" },
    encoding: "utf8",
    timeout: 20000,
  });
  if (nodeCheck.status !== 0) {
    throw new Error(`Packed ELECTRON_RUN_AS_NODE --check failed: ${nodeCheck.stderr || nodeCheck.stdout}`);
  }
  return located;
}

async function run() {
  const port = await getFreePort();
  const tmpData = mkdtempSync(join(tmpdir(), "fanal-desktop-smoke-"));
  const tmpPackDir = PACKED ? mkdtempSync(join(tmpdir(), "fanal-packed-smoke-")) : null;

  try {
    let launchBin;
    let launchArgs = [];
    let launchCwd = APP_DIR;

    if (PACKED) {
      const packed = buildPackedDir(tmpPackDir);
      launchBin = packed.execPath;
      launchCwd = packed.cwd;
    } else {
      launchBin = resolveElectronBin();
      launchArgs.push(APP_DIR);
    }

    const url = `http://127.0.0.1:${port}/dashboard`;
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.ELECTRON_RUN_AS_NODE_POLL;
    env.LE_VEILLEUX_SMOKE = "1";
    env.LE_VEILLEUX_URL = url;
    env.DSH_SUPERVISOR_DATA = tmpData;
    env.DSH_SUPERVISOR_PORT = String(port);

    if (process.env.CI === "true" && (process.platform === "linux" || process.platform === "win32")) {
      launchArgs.push("--disable-gpu");
      if (process.platform === "linux") launchArgs.push("--no-sandbox");
    }

    console.log(`smoke-desktop: launching ${PACKED ? "PACKED " : ""}Electron at ${url} (timeout ${TIMEOUT_MS}ms)`);

    let output = "";
    let timedOut = false;

    const result = await new Promise((resolveRun) => {
      const child = spawn(launchBin, launchArgs, {
        cwd: launchCwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const timer = setTimeout(() => {
        timedOut = true;
        try { child.kill("SIGTERM"); } catch {}
        setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, 1500).unref();
      }, TIMEOUT_MS);
      child.stdout.on("data", (d) => { output += d; });
      child.stderr.on("data", (d) => { output += d; });
      child.on("error", (err) => {
        clearTimeout(timer);
        resolveRun({ code: -1, error: err.message });
      });
      child.on("close", (code, signal) => {
        clearTimeout(timer);
        resolveRun({ code, signal });
      });
    });

    if (timedOut) {
      console.error("smoke-desktop FAILED: timed out");
      if (output.trim()) console.error(output.trim());
      process.exit(1);
    }
    if (result.error) {
      console.error(`smoke-desktop FAILED: ${result.error}`);
      process.exit(1);
    }
    if (result.code !== 0 || !output.includes("SMOKE OK")) {
      console.error(`smoke-desktop FAILED (exit=${result.code}, signal=${result.signal || "none"}):`);
      console.error(output.trim() || "(no output)");
      process.exit(1);
    }

    console.log(`smoke-desktop ${PACKED ? "PACKED " : ""}PASSED (port=${port})`);
  } finally {
    try { rmSync(tmpData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {}
    if (tmpPackDir) {
      try { rmSync(tmpPackDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {}
    }
  }
}

run().catch((err) => {
  console.error("smoke-desktop FAILED:", err && err.stack ? err.stack : err);
  process.exit(1);
});
