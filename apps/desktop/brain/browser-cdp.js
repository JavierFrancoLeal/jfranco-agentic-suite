// Fanal — browser-cdp.js: the VISIBLE browser pilot (zero dependencies).
// Doctrine: the machine NEVER drives the client's browser invisibly.
// The badge is injected on every page and cannot be hidden.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const CHROME = process.env.FANAL_CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9222;
let child = null;

function browserRuntimeDir() {
  const base = process.env.DSH_SUPERVISOR_DATA || path.join(os.homedir(), ".dsh", "supervisor-data");
  const dir = path.join(base, "browser-profile");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dir, 0o700); } catch {}
  return dir;
}

function chromeExists() {
  return !!process.env.FANAL_CHROME_BIN || fs.existsSync(CHROME);
}

function launch(url) {
  return new Promise((resolve, reject) => {
    if (!chromeExists()) return reject(new Error("Chrome not found"));
    if (child) return resolve({ ok: false, error: "already running" });
    const profileDir = browserRuntimeDir();
    const errLog = fs.createWriteStream(path.join(profileDir, "browser-stderr.log"), { flags: "a", mode: 0o600 });
    const exitLogPath = path.join(profileDir, "browser-exit.log");
    child = spawn(CHROME, ["--remote-debugging-port=" + PORT, "--user-data-dir=" + profileDir, "--no-first-run", "--no-default-browser-check", String(url || "about:blank")], { stdio: ["ignore", "ignore", "pipe"] });
    child.stderr.on("data", (d) => { try { errLog.write(d); } catch {} });
    child.on("error", (e) => { try { fs.appendFileSync(exitLogPath, "spawn error: " + e.message + "\n", { mode: 0o600 }); } catch {} reject(e); });
    child.on("exit", (code) => { try { fs.appendFileSync(exitLogPath, "exit code: " + code + "\n", { mode: 0o600 }); } catch {} child = null; });
    resolve({ ok: true });
  });
}

function targets() {
  return fetch("http://127.0.0.1:" + PORT + "/json").then(r => r.json()).catch(() => []);
}

async function wsTarget() {
  const t = await targets();
  const page = t.find(x => x.type === "page") || t[0];
  if (!page) throw new Error("no page target");
  return page.webSocketDebuggerUrl;
}

function cdpCall(ws, method, params, id) {
  return new Promise((resolve, reject) => {
    const mid = id || Math.floor(Math.random() * 1e9);
    const onMsg = (ev) => {
      const j = JSON.parse(ev.data);
      if (j.id === mid) { ws.removeEventListener("message", onMsg); j.error ? reject(new Error(j.error.message)) : resolve(j.result); }
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });
}

async function withCdp(fn) {
  const url = await wsTarget();
  const ws = new WebSocket(url);
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
  try { return await fn(ws); } finally { try { ws.close(); } catch {} }
}

// The badge: always on, on every page, impossible to hide from the API.
const BADGE_JS = `(function(){
  if(document.getElementById("fanal-pilot-badge"))return;
  var b=document.createElement("div");b.id="fanal-pilot-badge";
  b.style.cssText="position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483647;background:linear-gradient(135deg,#4D6BFE,#7c5cff);color:#fff;font:700 13px -apple-system,'Segoe UI',Roboto,sans-serif;padding:8px 18px;border-radius:999px;box-shadow:0 8px 24px rgba(15,23,42,.35);letter-spacing:.02em;pointer-events:none";
  b.textContent="🤖 Fanal pilote ce navigateur — chaque action est journalisée";
  document.body.appendChild(b);
})();`;

function nav(url) {
  return withCdp(ws => cdpCall(ws, "Page.navigate", { url: String(url) }).then(async () => {
    await new Promise(r => setTimeout(r, 1200));
    await cdpCall(ws, "Runtime.evaluate", { expression: BADGE_JS });
    return { ok: true, url };
  }));
}

function evalJs(js) {
  return withCdp(ws => cdpCall(ws, "Runtime.evaluate", { expression: "(()=>{ try{ return {value: (" + js + ")} }catch(e){ return {error:String(e)} } })()", returnByValue: true }).then(r => ({ ok: true, result: r.result && r.result.value })));
}

function stop() {
  if (child) { try { child.kill(); } catch {} child = null; }
  return { ok: true };
}

module.exports = { launch, nav, evalJs, stop, targets, chromeExists };
