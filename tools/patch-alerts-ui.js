// Patch: dashboard alert bar + shift card UI + server tweaks. No template literals.
const fs = require("fs");
const fails = [];
const L = (lines) => lines.join("\n");
function patch(file, pairs) {
  let t = fs.readFileSync(file, "utf8");
  for (const [a, b] of pairs) {
    if (t.includes(a)) t = t.replace(a, b);
    else fails.push(file.slice(0, 14) + " :: " + a.slice(0, 45));
  }
  fs.writeFileSync(file, t);
}

// ── SERVER tweaks ───────────────────────────────────────────
patch("supervisor/server.js", [
  ['if (pathname === "/api/shift" && req.method === "GET") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const sh = shiftRead(); const same = sh.date === todayStr(); return send(res, 200, { opened: same ? sh.opened : null, closed: same ? sh.closed : null }); }',
   'if (pathname === "/api/shift" && req.method === "GET") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const sh = shiftRead(); const same = sh.date === todayStr(); const opened = same ? sh.opened : null; const closed = same ? sh.closed : null; const phase = !opened ? "open" : (!closed ? "close" : "done"); const steps = phase === "open" ? SECTOR_OPEN : phase === "close" ? SECTOR_CLOSE : []; const bucket = phase === "open" ? (sh.openSteps || []) : (sh.closeSteps || []); return send(res, 200, { opened, closed, phase, steps: steps.map((st) => ({ id: st.id, label: st.label, done: bucket.some((x) => x.id === st.id) })) }); }'],
  ['return send(res, 200, { reportsWeek:',
   'l.notices = l.notices || [];\n    return send(res, 200, { notice: l.notices.length ? l.notices[l.notices.length - 1] : null, reportsWeek:'],
  ['setTimeout(weatherCheck, 4000);',
   'setTimeout(weatherCheck, 4000);\nif (process.env.DSH_ALERT_TEST === "1") setTimeout(() => { const a = alertsRead(); if (!a.items.some((x) => x.status === "active")) { a.items.push({ id: "a" + Date.now(), key: "test-" + Date.now(), kind: "rain", pct: 85, inHour: 1, ts: ts(), status: "active", decision: null, source: "test" }); alertsWrite(a); } }, 5000);'],
]);

// ── DASHBOARD HTML + CSS ────────────────────────────────────
let h = fs.readFileSync("supervisor/dashboard.html", "utf8");
const bar = L([
  '</main>',
  '  <div id="alertBar" class="hidden">',
  '    <div class="alert-inner">',
  '      <div id="alertText"></div>',
  '      <div class="alert-actions">',
  "        <button class=\"btn small\" id=\"alertYes\">Oui — prévenir l'équipe</button>",
  '        <button class="btn small gray" id="alertNo">Non (par défaut · 10 s)</button>',
  '      </div>',
  '    </div>',
  '    <div class="alert-cd"><div id="alertCdown"></div></div>',
  '  </div>',
]);
if (h.includes("</main>\n")) h = h.replace("</main>\n", bar);
else fails.push("dashboard :: </main>");
if (h.includes('<div class="card"><h2 id="regDayTitle">')) {
  h = h.replace('<div class="card"><h2 id="regDayTitle">',
    '<div class="card" id="shiftCard"><h2 id="shiftTitle">🌅 Ouverture de la journée</h2><div id="shiftBody"></div><button class="btn small gray" id="closeDayBtn" style="display:none;margin-top:6px">Fermer la journée</button></div>\n      <div class="card"><h2 id="regDayTitle">');
} else fails.push("dashboard :: shiftCard");
const css = L([
  '#alertBar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);width:min(560px,94vw);background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border:1px solid #E5E7EB;border-radius:16px;box-shadow:0 12px 32px rgba(17,24,39,.18);z-index:80;overflow:hidden}',
  '.alert-inner{padding:12px 14px 10px}',
  '#alertText{font-size:14px;font-weight:700;color:#111827;margin-bottom:6px}',
  '#alertText small{display:block;font-weight:400;color:#6B7280;margin-top:2px}',
  '.alert-actions{display:flex;gap:8px}',
  '.alert-cd{height:4px;background:#E5E7EB}',
  '#alertCdown{height:4px;width:100%;background:#4D6BFE;animation:cdown 10s linear forwards}',
  '@keyframes cdown{from{width:100%}to{width:0}}',
  '@media(prefers-reduced-motion:reduce){#alertCdown{animation:none;width:0}}',
  '#shiftBody .step{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13.5px;color:#111827}',
  '#shiftBody .step input{width:18px;height:18px;accent-color:#4D6BFE}',
  '#shiftBody .done-note{color:#15803d;font-weight:700;font-size:13px}',
  '</style>',
]);
if (h.includes("</style>")) h = h.replace("</style>", css);
else fails.push("dashboard :: css");
fs.writeFileSync("supervisor/dashboard.html", h);

// ── DASHBOARD JS ────────────────────────────────────────────
let j = fs.readFileSync("supervisor/dashboard.html", "utf8");
const alertsJS = L([
  'let lastNoticeTs=0;',
  'async function pollAlerts(){',
  '  try{',
  '    const r=await api("/api/alerts");',
  '    if(!r||r.error)return;',
  '    if(r.active&&(me.role==="owner"||me.role==="lead"))showAlertBar(r.active);',
  '  }catch(e){}',
  '}',
  'function showAlertBar(a){',
  '  $("alertText").innerHTML=esc(t("alertRain").replace("X",a.pct).replace("Y",a.inHour))+"<small>"+esc(t("alertAsk"))+"</small>";',
  '  $("alertBar").classList.remove("hidden");',
  '  const cd=$("alertCdown");',
  '  cd.style.animation="none";void cd.offsetWidth;cd.style.animation="";',
  '  const timer=setTimeout(()=>{decideAlert(a.id,"no");},10000);',
  '  $("alertYes").onclick=async()=>{clearTimeout(timer);await decideAlert(a.id,"yes");};',
  '  $("alertNo").onclick=async()=>{clearTimeout(timer);await decideAlert(a.id,"no");};',
  '}',
  'async function decideAlert(id,decision){',
  '  await api("/api/alerts/decide",{id,decision});',
  '  $("alertBar").classList.add("hidden");',
  '  if(decision==="yes")toast(t("alertSent"));',
  '}',
  'function noticePoll(){',
  '  const l=lastLive||{};',
  '  const n=(l.notices||[]).slice(-1)[0];',
  '  if(n&&n.ts!==lastNoticeTs){lastNoticeTs=n.ts;toast("📢 "+n.text);}',
  '}',
  'async function loadShift(){',
  '  const r=await api("/api/shift");',
  '  if(!r||r.error||me.role!=="owner")return;',
  '  const b=$("shiftBody");let html="";',
  '  if(r.phase==="done"){',
  '    $("shiftTitle").textContent=t("shiftTitle");',
  '    html="<div class=\\"done-note\\">✔ "+esc(t("dayOpened").replace("X",r.opened.by).replace("HH:MM",(r.opened.ts||"").slice(11,16)))+"</div><div class=\\"done-note\\">🌙 "+esc(t("dayClosed").replace("X",r.closed.by).replace("HH:MM",(r.closed.ts||"").slice(11,16)))+"</div>";',
  '    $("closeDayBtn").style.display="none";',
  '  }else if(r.phase==="close"){',
  '    $("shiftTitle").textContent=t("shiftClose");',
  '    html=(r.steps||[]).map(s=>"<label class=\\"step\\"><input type=\\"checkbox\\" data-id=\\""+esc(s.id)+"\\" "+(s.done?"checked":"")+">"+esc(s.label)+"</label>").join("");',
  '    $("closeDayBtn").style.display="block";',
  '  }else{',
  '    $("shiftTitle").textContent=t("shiftOpen");',
  '    html=(r.steps||[]).map(s=>"<label class=\\"step\\"><input type=\\"checkbox\\" data-id=\\""+esc(s.id)+"\\" "+(s.done?"checked":"")+">"+esc(s.label)+"</label>").join("");',
  '    html+="<div class=\\"hint\\">"+esc(t("shiftHint"))+"</div>";',
  '    $("closeDayBtn").style.display="none";',
  '  }',
  '  b.innerHTML=html;',
  '  b.querySelectorAll("input[type=checkbox]").forEach(c=>c.onchange=async()=>{',
  '    const res=await api("/api/shift/mark",{stepId:c.dataset.id,done:c.checked});',
  '    if(res&&res.doneAll){toast(res.phase==="open"?t("dayOpenedToast"):t("dayClosedToast"));loadShift();}',
  '  });',
  '}',
  '$("closeDayBtn").onclick=()=>loadShift();',
  'setInterval(pollAlerts,60000);',
  'async function loadRegister(){',
]);
if (j.includes("async function loadRegister(){")) {
  j = j.replace("async function loadRegister(){", alertsJS);
} else fails.push("js :: loadRegister");
if (j.includes('if(me.role==="owner"){show("ownerView");try{if(!localStorage.getItem("lv-welcome"))$("welcomeCard").style.display="block";}catch(e){}loadRegister();loadMetrics($("ownerMetrics"));')) {
  j = j.replace('loadRegister();loadMetrics($("ownerMetrics"));', 'loadShift();pollAlerts();loadRegister();loadMetrics($("ownerMetrics"));');
} else fails.push("js :: owner enter");
if (j.includes('if(!(live.orders||[]).length)el.innerHTML=empty("📦",t("noOrders"));')) {
  j = j.replace('if(!(live.orders||[]).length)el.innerHTML=empty("📦",t("noOrders"));',
    'if(!(live.orders||[]).length)el.innerHTML=empty("📦",t("noOrders"));\n    noticePoll();');
} else fails.push("js :: noticePoll");
fs.writeFileSync("supervisor/dashboard.html", j);

// ── i18n (10 locales, tail anchor = setupHint) ──────────────
const SH = { en: "First run: create the owner account. This becomes your login.", es: "Primer arranque: crea la cuenta del dueño. Será tu acceso.", fr: "Premier lancement : créez le compte du propriétaire. Ce sera votre identifiant.", de: "Erster Start: Inhaberkonto anlegen. Das wird Ihr Zugang.", it: "Primo avvio: crea l'account del proprietario. Sarà il tuo accesso.", pt: "Primeiro arranque: crie a conta do dono. Será o seu acesso.", zh: "首次运行：创建所有者账户，这将成为您的登录方式。", ja: "初回起動：オーナーアカウントを作成します。これがログインになります。", ko: "첫 실행: 소유자 계정을 만듭니다. 이것이 로그인 정보가 됩니다.", ar: "التشغيل الأول: أنشئ حساب المالك. سيصبح هذا تسجيل دخولك." };
const K = {
  en: ["alertRain", "Rain likely (~X%) in ~Y h", "alertAsk", "Notify the team?", "alertSent", "Notice sent to the team.", "shiftTitle", "Day", "shiftOpen", "Opening of the day", "shiftClose", "Closing of the day", "shiftHint", "Check each item — the record stays in the app.", "dayOpened", "Day opened — X at HH:MM", "dayClosed", "Day closed — X at HH:MM", "dayOpenedToast", "Day opened ✔", "dayClosedToast", "Day closed ✔", "closeDayBtn", "Close the day"],
  es: ["alertRain", "Lluvia probable (~X%) en ~Y h", "alertAsk", "¿Avisar al equipo?", "alertSent", "Aviso enviado al equipo.", "shiftTitle", "Jornada", "shiftOpen", "Apertura de la jornada", "shiftClose", "Cierre de la jornada", "shiftHint", "Marca cada punto — el registro queda en la app.", "dayOpened", "Jornada abierta — X a las HH:MM", "dayClosed", "Jornada cerrada — X a las HH:MM", "dayOpenedToast", "Jornada abierta ✔", "dayClosedToast", "Jornada cerrada ✔", "closeDayBtn", "Cerrar la jornada"],
  fr: ["alertRain", "Pluie probable (~X %) dans ~Y h", "alertAsk", "Prévenir l'équipe ?", "alertSent", "Avis envoyé à l'équipe.", "shiftTitle", "Journée", "shiftOpen", "Ouverture de la journée", "shiftClose", "Fermeture de la journée", "shiftHint", "Cochez chaque point — le registre reste dans l'app.", "dayOpened", "Journée ouverte — X à HH:MM", "dayClosed", "Journée fermée — X à HH:MM", "dayOpenedToast", "Journée ouverte ✔", "dayClosedToast", "Journée fermée ✔", "closeDayBtn", "Fermer la journée"],
  de: ["alertRain", "Regen wahrscheinlich (~X %) in ~Y h", "alertAsk", "Team benachrichtigen?", "alertSent", "Meldung an das Team gesendet.", "shiftTitle", "Tag", "shiftOpen", "Tagesbeginn", "shiftClose", "Tagesabschluss", "shiftHint", "Jeden Punkt abhaken — die Aufzeichnung bleibt in der App.", "dayOpened", "Tag eröffnet — X um HH:MM", "dayClosed", "Tag geschlossen — X um HH:MM", "dayOpenedToast", "Tag eröffnet ✔", "dayClosedToast", "Tag geschlossen ✔", "closeDayBtn", "Tag schließen"],
  it: ["alertRain", "Pioggia probabile (~X%) tra ~Y h", "alertAsk", "Avvisare il team?", "alertSent", "Avviso inviato al team.", "shiftTitle", "Giornata", "shiftOpen", "Apertura della giornata", "shiftClose", "Chiusura della giornata", "shiftHint", "Spunta ogni punto — il registro resta nell'app.", "dayOpened", "Giornata aperta — X alle HH:MM", "dayClosed", "Giornata chiusa — X alle HH:MM", "dayOpenedToast", "Giornata aperta ✔", "dayClosedToast", "Giornata chiusa ✔", "closeDayBtn", "Chiudi la giornata"],
  pt: ["alertRain", "Chuva provável (~X%) em ~Y h", "alertAsk", "Avisar a equipa?", "alertSent", "Aviso enviado à equipa.", "shiftTitle", "Jornada", "shiftOpen", "Abertura da jornada", "shiftClose", "Fecho da jornada", "shiftHint", "Marque cada ponto — o registo fica na app.", "dayOpened", "Jornada aberta — X às HH:MM", "dayClosed", "Jornada fechada — X às HH:MM", "dayOpenedToast", "Jornada aberta ✔", "dayClosedToast", "Jornada fechada ✔", "closeDayBtn", "Fechar a jornada"],
  zh: ["alertRain", "~Y 小时内可能下雨（~X%）", "alertAsk", "通知团队？", "alertSent", "通知已发送给团队。", "shiftTitle", "当班", "shiftOpen", "开始营业", "shiftClose", "结束营业", "shiftHint", "逐项勾选 — 记录保留在应用中。", "dayOpened", "已开始营业 — X · HH:MM", "dayClosed", "已结束营业 — X · HH:MM", "dayOpenedToast", "已开始营业 ✔", "dayClosedToast", "已结束营业 ✔", "closeDayBtn", "结束营业"],
  ja: ["alertRain", "約Y時間後に雨の可能性（~X%）", "alertAsk", "チームに通知しますか？", "alertSent", "チームに通知を送信しました。", "shiftTitle", "勤務日", "shiftOpen", "開店準備", "shiftClose", "閉店確認", "shiftHint", "各項目をチェック — 記録はアプリに残ります。", "dayOpened", "開店済み — X · HH:MM", "dayClosed", "閉店済み — X · HH:MM", "dayOpenedToast", "開店済み ✔", "dayClosedToast", "閉店済み ✔", "closeDayBtn", "閉店する"],
  ko: ["alertRain", "약 Y시간 후 비 가능성 (~X%)", "alertAsk", "팀에 알릴까요?", "alertSent", "팀에 알림을 보냈습니다.", "shiftTitle", "근무일", "shiftOpen", "개점 준비", "shiftClose", "폐점 확인", "shiftHint", "항목을 체크하세요 — 기록은 앱에 남습니다.", "dayOpened", "개점 완료 — X · HH:MM", "dayClosed", "폐점 완료 — X · HH:MM", "dayOpenedToast", "개점 완료 ✔", "dayClosedToast", "폐점 완료 ✔", "closeDayBtn", "폐점하기"],
  ar: ["alertRain", "احتمال هطول أمطار (~X%) خلال ~Y س", "alertAsk", "إبلاغ الفريق؟", "alertSent", "تم إرسال الإشعار إلى الفريق.", "shiftTitle", "يوم العمل", "shiftOpen", "افتتاح اليوم", "shiftClose", "إغلاق اليوم", "shiftHint", "علّم كل نقطة — يبقى السجل في التطبيق.", "dayOpened", "تم افتتاح اليوم — X الساعة HH:MM", "dayClosed", "تم إغلاق اليوم — X الساعة HH:MM", "dayOpenedToast", "تم الافتتاح ✔", "dayClosedToast", "تم الإغلاق ✔", "closeDayBtn", "إغلاق اليوم"],
};
let d = fs.readFileSync("supervisor/dashboard.html", "utf8");
for (const [l, arr] of Object.entries(K)) {
  const anchor = 'setupHint:"' + SH[l] + '"}';
  if (d.includes(anchor)) {
    let add = "";
    for (let i = 0; i < arr.length; i += 2) add += "," + arr[i] + ":" + JSON.stringify(arr[i + 1]);
    d = d.split(anchor).join('setupHint:"' + SH[l] + '"' + add + "}");
  } else fails.push("i18n tail :: " + l);
}
fs.writeFileSync("supervisor/dashboard.html", d);
console.log("UI + i18n aplicados. Pendientes:", fails.length ? fails.join(" | ") : "ninguno");
