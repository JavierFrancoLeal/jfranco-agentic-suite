// Patch: on-demand demo alert (for re-testing the decision bar anytime).
const fs = require("fs");
const fails = [];
function patch(file, pairs) {
  let t = fs.readFileSync(file, "utf8");
  for (const [a, b] of pairs) {
    if (t.includes(a)) t = t.replace(a, b);
    else fails.push(file.slice(0, 14) + " :: " + a.slice(0, 40));
  }
  fs.writeFileSync(file, t);
}

// SERVER: demo-only endpoint that re-arms a fresh alert on demand
patch("supervisor/server.js", [
  ['if (pathname === "/api/demo-login" && req.method === "POST") {',
   'if (pathname === "/api/demo/alert" && req.method === "POST") { if (process.env.DSH_DEMO_MODE !== "1") return send(res, 403, { error: "demo mode disabled" }); const a = alertsRead(); a.items.push({ id: "a" + Date.now(), key: "demo-" + Date.now(), kind: "rain", pct: 85, inHour: 1, ts: ts(), status: "active", decision: null, source: "demo" }); alertsWrite(a); return send(res, 200, { ok: true }); }\n  if (pathname === "/api/demo-login" && req.method === "POST") {'],
]);

// DASHBOARD: ?demo=owner&alert=1 → enter, then re-arm and show the bar
let d = fs.readFileSync("supervisor/dashboard.html", "utf8");
const old = '(async()=>{const dm=(/[?&]demo=([a-z]+)/.exec(location.search)||[])[1];if(dm){const r=await api("/api/demo-login",{role:dm});if(r&&r.token){token=r.token;me={name:r.name,role:r.role,label:r.label||r.name};sessionStorage.setItem("dsh-sup-token",token);sessionStorage.setItem("dsh-sup-me",JSON.stringify(me));enter();return;}}})();';
const neu = '(async()=>{const dm=(/[?&]demo=([a-z]+)/.exec(location.search)||[])[1];if(dm){const r=await api("/api/demo-login",{role:dm});if(r&&r.token){token=r.token;me={name:r.name,role:r.role,label:r.label||r.name};sessionStorage.setItem("dsh-sup-token",token);sessionStorage.setItem("dsh-sup-me",JSON.stringify(me));enter();if(/[?&]alert=1/.test(location.search)){await api("/api/demo/alert");setTimeout(pollAlerts,400);}return;}}})();';
if (d.includes(old)) d = d.replace(old, neu);
else fails.push("demo alert param");
fs.writeFileSync("supervisor/dashboard.html", d);
console.log("re-prueba de alerta. Pendientes:", fails.length ? fails.join(" | ") : "ninguno");
