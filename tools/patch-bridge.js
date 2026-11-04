// Patch: the Facebook/Messenger bridge (ingestion endpoint) + inbox polish (bell pulse + timestamps).
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

// ── SERVER: bridge ingestion (client's own machine; token-guarded) ──
patch("supervisor/server.js", [
  ['if (pathname === "/api/studio/inbox" && req.method === "GET") {',
   'if (pathname === "/api/bridge/message" && req.method === "POST") { const bt = process.env.DSH_BRIDGE_TOKEN; const given = req.headers["x-bridge-token"] || ""; if (bt && given !== bt) return send(res, 401, { error: "bad bridge token" }); if (!bt) { const u = auth(req); if (!u || (u.role !== "owner" && u.role !== "lead")) return send(res, 401, { error: "unauthorized" }); } const b = await json(req); const tk = tasksRead(); const id = "t" + Date.now(); tk.tasks.push({ id, type: "email", text: String(b.from || "client") + " : " + String(b.text || ""), by: "Facebook", ts: ts(), status: "pending", result: null }); tasksWrite(tk); const l = liveRead(); l.inbox = l.inbox || []; l.inbox.push({ from: "Facebook", kind: "studio", id, text: String(b.from || "client") + " :: " + String(b.text || "") }); liveWrite(l); return send(res, 200, { ok: true, id }); }\n  if (pathname === "/api/studio/inbox" && req.method === "GET") {'],
]);

// ── DASHBOARD polish: bell pulse when decisions pending + timestamps ──
let h = fs.readFileSync("supervisor/dashboard.html", "utf8");
if (h.includes('@media(prefers-reduced-motion:reduce){.noSendFill{animation:none;transform:scaleX(0)}}')) {
  h = h.replace('@media(prefers-reduced-motion:reduce){.noSendFill{animation:none;transform:scaleX(0)}}',
    '@media(prefers-reduced-motion:reduce){.noSendFill{animation:none;transform:scaleX(0)}}\n#notifBell.bell-pulse{animation:bellPulse 1.1s ease-in-out infinite}\n@keyframes bellPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}\n@media(prefers-reduced-motion:reduce){#notifBell.bell-pulse{animation:none}}\n.inbox-item .when{font-size:11px;color:#9CA3AF}');
} else fails.push("bell css");
fs.writeFileSync("supervisor/dashboard.html", h);

let j = fs.readFileSync("supervisor/dashboard.html", "utf8");
// pulse toggled with the badge
if (j.includes('if(n>0){b.textContent=n;b.classList.remove("hidden");}else b.classList.add("hidden");')) {
  j = j.replace('if(n>0){b.textContent=n;b.classList.remove("hidden");}else b.classList.add("hidden");',
    'if(n>0){b.textContent=n;b.classList.remove("hidden");$("notifBell").classList.add("bell-pulse");}else{b.classList.add("hidden");$("notifBell").classList.remove("bell-pulse");}');
} else fails.push("badge pulse");
// timestamps in the inbox items
if (j.includes('return "<div class=\\"inbox-item\\" data-id=\\""+esc(x.id)+"\\"><b>🔔 "+esc(name)+"</b><br><span class=\\"hint\\">"+esc((x.text||"").slice(0,90))+"</span></div>";')) {
  j = j.replace('return "<div class=\\"inbox-item\\" data-id=\\""+esc(x.id)+"\\"><b>🔔 "+esc(name)+"</b><br><span class=\\"hint\\">"+esc((x.text||"").slice(0,90))+"</span></div>";',
    'return "<div class=\\"inbox-item\\" data-id=\\""+esc(x.id)+"\\"><b>🔔 "+esc(name)+"</b> <span class=\\"when\\">"+esc((x.ts||"").slice(11,16))+"</span><br><span class=\\"hint\\">"+esc((x.text||"").slice(0,90))+"</span></div>";');
} else fails.push("timestamps");
fs.writeFileSync("supervisor/dashboard.html", j);
console.log("puente + pulido. Pendientes:", fails.length ? fails.join(" | ") : "ninguno");
