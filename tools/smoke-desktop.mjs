#!/usr/bin/env node
// smoke-desktop.mjs — cross-platform Electron launch smoke test for Fanal.
// Spawns the desktop Electron app against an isolated temp data directory and
// ephemeral localhost port with LE_VEILLEUX_SMOKE=1, asserts exit 0 + "SMOKE OK",
// and cleans up without touching ~/.dsh or killing unrelated Electron processes.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { spawn } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = join(ROOT, "apps", "desktop");
const TIMEOUT_MS = Number(process.env.FANAL_SMOKE_TIMEOUT_MS || 35000);

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

async function run() {
  const electronBin = resolveElectronBin();
  const port = await getFreePort();
  const tmpData = mkdtempSync(join(tmpdir(), "fanal-desktop-smoke-"));
  const url = `http://127.0.0.1:${port}/dashboard`;

  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.ELECTRON_RUN_AS_NODE_POLL;
  env.LE_VEILLEUX_SMOKE = "1";
  env.LE_VEILLEUX_URL = url;
  env.DSH_SUPERVISOR_DATA = tmpData;
  env.DSH_SUPERVISOR_PORT = String(port);

  const extraArgs = [];
  if (process.env.CI === "true" && (process.platform === "linux" || process.platform === "win32")) {
    extraArgs.push("--disable-gpu");
    if (process.platform === "linux") extraArgs.push("--no-sandbox");
  }

  console.log(`smoke-desktop: launching Electron at ${url} (timeout ${TIMEOUT_MS}ms)`);

  let output = "";
  let timedOut = false;

  const result = await new Promise((resolveRun) => {
    const child = spawn(electronBin, [APP_DIR, ...extraArgs], {
      cwd: APP_DIR,
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

  try {
    rmSync(tmpData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch {}

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

  console.log(`smoke-desktop PASSED (port=${port})`);
}

run().catch((err) => {
  console.error("smoke-desktop FAILED:", err && err.stack ? err.stack : err);
  process.exit(1);
});
