#!/usr/bin/env node
// test-editions.mjs — verifies Fanal (Client) vs Fanal Studio (Creator/Operator) edition isolation:
//   - Separate defaults: ports (8787 vs 8788), appIds, DATA_DIR paths, Electron userData & partition
//   - Default repo apps/desktop/edition.json strictly pinned to "client"
//   - Client server strictly blocks creator-only routes with 403 studio_edition_only
//   - Studio server serves /api/edition=studio, inspects & re-sanitizes diagnostic bundles without PII/secrets

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { resolveEdition, inspectSanitizedDiagnosticBundle } = require(join(ROOT, "supervisor", "edition.js"));

function getFreePort() {
  return new Promise((res, rej) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", rej);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close((e) => (e ? rej(e) : res(port)));
    });
  });
}

async function waitHealthy(base) {
  for (let i = 0; i < 40; i += 1) {
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) return r.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Server at ${base} failed health check`);
}

function testEditionResolver() {
  const edManifest = JSON.parse(readFileSync(join(ROOT, "apps", "desktop", "edition.json"), "utf8"));
  assert.equal(edManifest.edition, "client", "apps/desktop/edition.json must default to client");
  assert.equal(edManifest.appId, "ca.trasunto.fanal");

  const client = resolveEdition({ env: {}, cliArgs: [], appDir: join(ROOT, "apps", "desktop"), homedir: "/tmp/test-home" });
  const studio = resolveEdition({ env: { FANAL_EDITION: "studio" }, cliArgs: [], appDir: join(ROOT, "apps", "desktop"), homedir: "/tmp/test-home" });

  assert.equal(client.id, "client");
  assert.equal(client.defaultPort, 8787);
  assert.equal(client.allowCreatorRoutes, false);
  assert.equal(client.electronUserDataName, "Fanal");
  assert.equal(client.defaultDesktopDataDir, join("/tmp/test-home", ".dsh", "supervisor-data"));

  assert.equal(studio.id, "studio");
  assert.equal(studio.defaultPort, 8788);
  assert.equal(studio.allowCreatorRoutes, true);
  assert.equal(studio.electronUserDataName, "Fanal Studio");
  assert.equal(studio.defaultDesktopDataDir, join("/tmp/test-home", ".dsh", "trasunto-studio-data"));

  assert.notEqual(client.electronUserDataName, studio.electronUserDataName);
  assert.notEqual(client.electronPartition, studio.electronPartition);
  assert.notEqual(client.defaultDesktopDataDir, studio.defaultDesktopDataDir);
  assert.notEqual(client.defaultPort, studio.defaultPort);

  // CLI override must also work cleanly
  const cliStudio = resolveEdition({ env: {}, cliArgs: ["--studio"], homedir: "/tmp/test-home" });
  assert.equal(cliStudio.id, "studio");

  // Diagnostic sanitizer strips secrets & user paths cleanly
  const out = inspectSanitizedDiagnosticBundle({
    rawContent: JSON.stringify({
      diagnostic: {
        appVersion: "0.1.0",
        platform: "darwin",
        recentTickets: [{ ticketId: "FNL-1", userProblemDescription: "Key sk-secret1234567890 at /Users/alice/docs" }],
      },
    }),
    redactFn: (s) => String(s).replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED]").replace(/\/Users\/[^\s/"']+/g, "/Users/[USER]"),
  });
  assert.equal(out.ok, true);
  assert.ok(!out.summary.latestNote.includes("sk-secret"));
  assert.ok(!out.summary.latestNote.includes("/Users/alice"));
}

async function testLiveServerIsolation() {
  const clientData = mkdtempSync(join(tmpdir(), "fanal-client-ed-"));
  const studioData = mkdtempSync(join(tmpdir(), "fanal-studio-ed-"));
  const clientPort = await getFreePort();
  const studioPort = await getFreePort();

  const spawnSrv = (edition, port, dataDir) => spawn(process.execPath, [join(ROOT, "supervisor", "server.js")], {
    cwd: ROOT,
    env: {
      ...process.env,
      FANAL_EDITION: edition,
      DSH_SUPERVISOR_PORT: String(port),
      DSH_SUPERVISOR_DATA: dataDir,
      DSH_DISABLE_HTTPS: "1",
    },
    stdio: "ignore",
  });

  const cProc = spawnSrv("client", clientPort, clientData);
  const sProc = spawnSrv("studio", studioPort, studioData);

  try {
    const cBase = `http://127.0.0.1:${clientPort}`;
    const sBase = `http://127.0.0.1:${studioPort}`;
    const [cHealth, sHealth] = await Promise.all([waitHealthy(cBase), waitHealthy(sBase)]);
    assert.equal(cHealth.edition, "client");
    assert.equal(sHealth.edition, "studio");

    const cEd = await (await fetch(`${cBase}/api/edition`)).json();
    const sEd = await (await fetch(`${sBase}/api/edition`)).json();
    assert.equal(cEd.edition, "client");
    assert.equal(cEd.creatorTools, false);
    assert.equal(sEd.edition, "studio");
    assert.equal(sEd.creatorTools, true);

    // Verify strict setup rejects incomplete payload (400) before full closed Constitution setup
    const weakSetup = await fetch(`${cBase}/api/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fanal-CSRF": "1" },
      body: JSON.stringify({ user: "jfranco", password: "short", sector: "restaurant" }),
    });
    assert.equal(weakSetup.status, 400, "client must reject weak/incomplete /api/setup with 400");

    // Setup owner on both isolated instances
    const setupBody = JSON.stringify({
      user: "jfranco",
      password: "BistroGuard!2026",
      passwordConfirm: "BistroGuard!2026",
      scaleType: "SME_CELL",
      sector: "restaurant",
      constitution: {
        bizName: "Bistro Edition Test",
        taxRegime: "INSCRIT_TPS_TVQ",
        neq: "1145678901",
        tpsNumber: "123456789RT0001",
        tvqNumber: "1234567890TQ0001",
        rprpName: "J. Franco",
        rprpEmail: "rprp@bistro-test.example",
        toneRegister: "VOUVOIEMENT_CHALEUREUX",
        pricingFloorCad: 500,
        discountPolicy: "TIERED_MAX_5_PCT",
        escalationRules: ["RED_PROMISE_DEADLINE", "RED_REFUND_OVER_FLOOR"],
        signerInitials: "JF",
      },
    });
    const [cSetup, sSetup] = await Promise.all([
      fetch(`${cBase}/api/setup`, { method: "POST", headers: { "Content-Type": "application/json", "X-Fanal-CSRF": "1" }, body: setupBody }).then((r) => r.json()),
      fetch(`${sBase}/api/setup`, { method: "POST", headers: { "Content-Type": "application/json", "X-Fanal-CSRF": "1" }, body: setupBody }).then((r) => r.json()),
    ]);
    assert.ok(cSetup.token, "client owner setup token");
    assert.ok(sSetup.token, "studio owner setup token");

    // Client strictly blocks creator-only routes even for authenticated owner!
    for (const [method, endpoint, body] of [
      ["GET", "/api/nodes"],
      ["GET", "/api/studio/diagnostics"],
      ["POST", "/api/studio/diagnostic/inspect", { content: "hello" }],
      ["POST", "/api/passport/verify", { headerB64: "", masterPubDer: "" }],
    ]) {
      const resp = await fetch(`${cBase}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${cSetup.token}`,
          ...(body ? { "Content-Type": "application/json", "X-Fanal-CSRF": "1" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      assert.equal(resp.status, 403, `client must return 403 on ${endpoint}`);
      const j = await resp.json();
      assert.equal(j.error, "studio_edition_only");
    }

    // Studio allows creator-only diagnostic inspector & node registry in its isolated data dir
    const insp = await fetch(`${sBase}/api/studio/diagnostic/inspect`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sSetup.token}`, "Content-Type": "application/json", "X-Fanal-CSRF": "1" },
      body: JSON.stringify({ content: "# Fanal Diagnostic\nApp Version: 0.1.0\nPlatform: darwin\nUser: /Users/client1\nKey: AIzaSyTestFakeSecretKey999\n" }),
    }).then((r) => r.json());
    assert.equal(insp.ok, true);
    assert.equal(insp.summary.loi25Redacted, true);
    assert.ok(!JSON.stringify(insp).includes("AIzaSyTestFakeSecretKey999"));
    assert.ok(!JSON.stringify(insp).includes("/Users/client1"));

    const nodeAdd = await fetch(`${sBase}/api/nodes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sSetup.token}`, "Content-Type": "application/json", "X-Fanal-CSRF": "1" },
      body: JSON.stringify({ name: "Piloto Mac #2", url: "http://127.0.0.1:8787", sector: "restaurant" }),
    }).then((r) => r.json());
    assert.equal(nodeAdd.nodes.length, 1);
    assert.equal(nodeAdd.nodes[0].name, "Piloto Mac #2");
  } finally {
    try { cProc.kill("SIGTERM"); } catch {}
    try { sProc.kill("SIGTERM"); } catch {}
    try { rmSync(clientData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {}
    try { rmSync(studioData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {}
  }
}

async function main() {
  testEditionResolver();
  await testLiveServerIsolation();
  console.log("test-editions PASSED: client (8787) vs studio (8788) strictly isolated");
}

main().catch((err) => {
  console.error("test-editions FAILED:", err && err.stack ? err.stack : err);
  process.exit(1);
});
