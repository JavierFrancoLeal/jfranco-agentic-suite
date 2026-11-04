// Patch: RBAC — notifications for levels 1-2 only; alerts visible to all, decision 1-2 only.
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

// ── SERVER: roles on the decision endpoints; the kitchen stays open ──
patch("supervisor/server.js", [
  // alerts: the DECISION is levels 1-2 only (everyone can see the info via GET)
  ['if (pathname === "/api/alerts/decide" && req.method === "POST") { const u = auth(req); if (!u) return send(res, 401, { error: "unauthorized" });',
   'if (pathname === "/api/alerts/decide" && req.method === "POST") { const u = auth(req); if (!u || (u.role !== "owner" && u.role !== "lead")) return send(res, 401, { error: "unauthorized" });'],
  // studio list/send: levels 1-2 only
  ['if (pathname === "/api/studio" && req.method === "GET") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const tk = tasksRead();',
   'if (pathname === "/api/studio" && req.method === "GET") { const u = auth(req); if (!u || (u.role !== "owner" && u.role !== "lead")) return send(res, 401, { error: "unauthorized" }); const tk = tasksRead();'],
  ['if (pathname === "/api/studio/send" && req.method === "POST") { const u = auth(req); if (!u) return send(res, 401, { error: "unauthorized" });',
   'if (pathname === "/api/studio/send" && req.method === "POST") { const u = auth(req); if (!u || (u.role !== "owner" && u.role !== "lead")) return send(res, 401, { error: "unauthorized" });'],
  ['if (pathname === "/api/studio" && req.method === "POST") { const u = auth(req); if (!u) return send(res, 401, { error: "unauthorized" });',
   'if (pathname === "/api/studio" && req.method === "POST") { const u = auth(req); if (!u || (u.role !== "owner" && u.role !== "lead")) return send(res, 401, { error: "unauthorized" });'],
  // the kitchen posts drafts without a session (like /api/deep/result)
  ['if (pathname === "/api/studio/result" && req.method === "POST") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const b = await json(req);',
   'if (pathname === "/api/studio/result" && req.method === "POST") { const b = await json(req);'],
]);

// ── DASHBOARD: everyone sees the alert; only 1-2 see the buttons ──
let j = fs.readFileSync("supervisor/dashboard.html", "utf8");
if (j.includes('if(r.active&&(me.role==="owner"||me.role==="lead"))showAlertBar(r.active);')) {
  j = j.replace('if(r.active&&(me.role==="owner"||me.role==="lead"))showAlertBar(r.active);',
    'if(r.active)showAlertBar(r.active);else{$("alertBar").classList.add("hidden");}');
} else fails.push("poll all");

fs.writeFileSync("supervisor/dashboard.html", j);

// ── i18n: alertWaiting (tail anchor = inboxNoSendDone) ───────
const NS = { en: "🔔 Notifications", es: "🔔 Notificaciones", fr: "🔔 Notifications", de: "🔔 Benachrichtigungen", it: "🔔 Notifiche", pt: "🔔 Notificações", zh: "🔔 通知", ja: "🔔 通知", ko: "🔔 알림", ar: "🔔 الإشعارات" };
const K = {
  en: ["alertWaiting", "Waiting for the manager's decision."],
  es: ["alertWaiting", "En espera de la decisión de la dirección."],
  fr: ["alertWaiting", "En attente de la décision de la direction."],
  de: ["alertWaiting", "Wartet auf die Entscheidung der Leitung."],
  it: ["alertWaiting", "In attesa della decisione della direzione."],
  pt: ["alertWaiting", "À espera da decisão da direção."],
  zh: ["alertWaiting", "等待管理层的决定。"],
  ja: ["alertWaiting", "経営陣の決定を待っています。"],
  ko: ["alertWaiting", "경영진의 결정을 기다리는 중입니다."],
  ar: ["alertWaiting", "في انتظار قرار الإدارة."],
};
let d = fs.readFileSync("supervisor/dashboard.html", "utf8");
for (const [l, arr] of Object.entries(K)) {
  const anchor = 'studioTitle:"' + NS[l] + '"}';
  if (d.includes(anchor)) {
    let add = "";
    for (let i = 0; i < arr.length; i += 2) add += "," + arr[i] + ":" + JSON.stringify(arr[i + 1]);
    d = d.split(anchor).join('inboxNoSendDone:"' + NS[l] + '"' + add + "}");
  } else fails.push("i18n :: " + l);
}
fs.writeFileSync("supervisor/dashboard.html", d);
console.log("RBAC aplicado. Pendientes:", fails.length ? fails.join(" | ") : "ninguno");
