// Patch: Studio → full-screen "Notifications" decision center (message + rationale + draft + send/nosend).
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

// ── SERVER: rationale in results + the send/nosend decision ──
patch("supervisor/server.js", [
  ['if (pathname === "/api/studio/result" && req.method === "POST") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const tk = tasksRead(); const it = tk.tasks.find((x) => x.id === b.id); if (!it) return send(res, 200, { ok: false }); it.result = String(b.result || ""); it.status = "done"; it.doneAt = ts(); tasksWrite(tk); return send(res, 200, { ok: true }); }',
   'if (pathname === "/api/studio/result" && req.method === "POST") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const tk = tasksRead(); const it = tk.tasks.find((x) => x.id === b.id); if (!it) return send(res, 200, { ok: false }); it.result = String(b.result || ""); it.rationale = String(b.rationale || ""); it.status = "done"; it.doneAt = ts(); tasksWrite(tk); return send(res, 200, { ok: true }); }'],
  ['if (pathname === "/api/studio/inbox" && req.method === "GET") {',
   'if (pathname === "/api/studio/send" && req.method === "POST") { const u = auth(req); if (!u) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const tk = tasksRead(); const it = tk.tasks.find((x) => x.id === b.id); if (!it || it.status !== "done") return send(res, 200, { ok: false }); it.status = b.decision === "send" ? "sent" : "dismissed"; it.decidedBy = u.name; it.decidedAt = ts(); tasksWrite(tk); return send(res, 200, { ok: true }); }\n  if (pathname === "/api/studio/inbox" && req.method === "GET") {'],
  // demo draft now carries a rationale (the "why" of the proposed response)
  ['it.result = "[Brouillon de démonstration — " + String(b.type || "autre") + "] " + String(b.text || "");',
   'it.result = "[Brouillon de démonstration — " + String(b.type || "autre") + "] " + String(b.text || ""); it.rationale = "Le client pose une question simple ; une réponse courte et chaleureuse renforce le lien et invite à venir. (Démonstration — la cuisine réelle argumente avec les données de l\'entreprise.)";'],
]);

// ── AGENT: the kitchen returns rationale + draft ────────────
patch("tools/agent-standby.sh", [
  ['SPROMPT="Drafts kitchen (Studio, Trasunto). The owner asked these tasks (each line: id ::: type :: request): \\$STXT Draft each one in professional French, short and ready to publish/send. Then for EACH task POST the draft as JSON to \\$SUP/api/studio/result with this shape: {\\"id\\":\\"<the task id>\\",\\"result\\":\\"<your draft>\\"}. Finally reply one line: drafts posted."',
   'SPROMPT="Decision center kitchen (Trasunto). The owner asked these tasks (each line: id ::: type :: request): \\$STXT For EACH: draft a short professional French response AND write in one sentence your reasoning (the motivation: why this reply, based on what). Then POST as JSON to \\$SUP/api/studio/result with this shape: {\\"id\\":\\"<the task id>\\",\\"result\\":\\"<your draft>\\",\\"rationale\\":\\"<your reasoning>\\"}. Finally reply one line: drafts posted."'],
]);

// ── DASHBOARD: rename the tab + full-screen inbox/decision UI ─
let h = fs.readFileSync("supervisor/dashboard.html", "utf8");
if (h.includes('<button data-tab="studio" id="tabStudio">📥 Studio</button>')) {
  h = h.replace('<button data-tab="studio" id="tabStudio">📥 Studio</button>',
    '<button data-tab="studio" id="tabStudio">🔔 Notifications</button>');
} else fails.push("tab rename");
if (h.includes('<button data-tab="studio">📥<span id="bnavStudio">Studio</span></button>')) {
  h = h.replace('<button data-tab="studio">📥<span id="bnavStudio">Studio</span></button>',
    '<button data-tab="studio">🔔<span id="bnavStudio">Notifications</span></button>');
} else fails.push("bnav rename");
// replace the small studio card with the full-screen decision center
const oldCardStart = '<div id="tab-studio" class="hidden">';
const idx = h.indexOf(oldCardStart);
if (idx >= 0) {
  const endMark = '<div id="tab-sector" class="hidden">';
  const endIdx = h.indexOf(endMark, idx);
  const block = [
    '<div id="tab-studio" class="hidden">',
    '  <div class="card">',
    '    <h2 id="studioTitle">🔔 Notifications</h2>',
    '    <p class="hint" id="studioHint">Describe the task — the draft returns here for your approval.</p>',
    '    <select id="studioType">',
    '      <option value="social">Social publication</option>',
    '      <option value="email">Email reply</option>',
    '      <option value="quote">Quote / bid</option>',
    '      <option value="job">Job posting</option>',
    '      <option value="agenda">Agenda & follow-ups</option>',
    '      <option value="other">Other</option>',
    '    </select>',
    '    <textarea id="studioText" rows="3" placeholder="In one sentence…"></textarea>',
    '    <button class="btn" id="studioSubmit">Submit</button>',
    '    <div id="studioList" style="margin-top:10px"></div>',
    '  </div>',
    '</div>',
    '',
  ].join("\n");
  h = h.slice(0, idx) + h.slice(idx + block.length);
  // the full-screen inbox overlay lives at the TOP level (next to langStep)
  const overlay = [
    '<div id="inboxView" class="hidden" style="display:none">',
    '  <div class="inbox-top">',
    '    <div class="inbox-head">',
    '      <h2 id="inboxTitle">🔔 Notifications</h2>',
    '      <button class="btn small gray" id="inboxClose">✕</button>',
    '    </div>',
    '    <p class="hint" id="inboxDesc"></p>',
    '  </div>',
    '  <div id="inboxList"></div>',
    '  <div id="inboxDecision" class="hidden"></div>',
    '</div>',
    '<div id="langStep" class="hidden" style="display:none">',
  ].join("\n");
  h = h.replace('<div id="langStep" class="hidden" style="display:none">', overlay);
} else fails.push("tab-studio block");
// CSS
const css = [
  '#inboxView{position:fixed;inset:0;background:linear-gradient(165deg,#e8edff 0%,#f6f7fb 45%,#fdf1f8 100%);z-index:85;display:flex;flex-direction:column;padding:18px 22px;overflow:auto}',
  '.inbox-top{max-width:680px;margin:0 auto;width:100%}',
  '.inbox-head{display:flex;justify-content:space-between;align-items:center}',
  '#inboxList{max-width:680px;margin:10px auto 0;width:100%}',
  '.inbox-item{background:rgba(255,255,255,.8);border:1px solid #E5E7EB;border-radius:14px;padding:12px 14px;margin:8px 0;cursor:pointer;box-shadow:0 4px 14px rgba(17,24,39,.05)}',
  '#inboxDecision{max-width:680px;margin:0 auto;width:100%;background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:16px;box-shadow:0 12px 32px rgba(17,24,39,.12)}',
  '#inboxDecision h3{font-size:11px;letter-spacing:.08em;color:#6B7280;margin:10px 0 4px;text-transform:uppercase}',
  '#inboxDecision .msg{font-size:14px;color:#111827;background:#F8F9FB;border-left:3px solid #4D6BFE;padding:10px 12px;border-radius:8px}',
  '#inboxDecision .draft{font-size:14px;color:#111827;background:#F5F7FF;border-left:3px solid #7C5CFF;padding:10px 12px;border-radius:8px}',
  '#inboxDecision .why{font-size:12.5px;color:#6B7280}',
  '.dec-actions{display:flex;gap:10px;margin-top:14px}',
  '#sendBtn{background:#fff;color:#111827;border:1px solid #E5E7EB;box-shadow:none;flex:1}',
  '#noSendBtn{position:relative;overflow:hidden;background:#F3F4F6;color:#111827;border:1px solid #E5E7EB;box-shadow:none;flex:1}',
  '.noSendTxt{position:relative;z-index:2}',
  '.noSendFill{position:absolute;inset:0;z-index:1;background:rgba(107,114,128,.38);backdrop-filter:blur(1.5px);-webkit-backdrop-filter:blur(1.5px);transform-origin:left;animation:noFill 10s linear forwards}',
  '@media(prefers-reduced-motion:reduce){.noSendFill{animation:none;transform:scaleX(0)}}',
  '</style>',
].join("\n");
if (h.includes("</style>")) h = h.replace("</style>", css);
else fails.push("inbox css");
fs.writeFileSync("supervisor/dashboard.html", h);

// ── DASHBOARD JS ────────────────────────────────────────────
let j = fs.readFileSync("supervisor/dashboard.html", "utf8");
// replace the studio render/submit with the inbox logic
const oldRender = j.indexOf('const STUDIO_TYPES=');
const oldSubmit = j.indexOf('$("studioSubmit").onclick=');
if (oldRender >= 0 && oldSubmit > oldRender) {
  const newBlock = [
    'const STUDIO_TYPES={social:"Social publication",email:"Email reply",quote:"Quote / bid",job:"Job posting",agenda:"Agenda & follow-ups",other:"Other"};',
    'function renderInbox(items){',
    '  const pend=items.filter(x=>x.status==="done");',
    '  $("inboxList").innerHTML=pend.length?pend.map(x=>{',
    '    const name=STUDIO_TYPES[x.type]||x.type;',
    '    return "<div class=\\"inbox-item\\" data-id=\\""+esc(x.id)+"\\"><b>🔔 "+esc(name)+"</b><br><span class=\\"hint\\">"+esc((x.text||"").slice(0,90))+"</span></div>";',
    '  }).join(""):empty("🔕",t("inboxEmpty"));',
    '  $("inboxList").querySelectorAll(".inbox-item").forEach(el=>el.onclick=()=>openDecision(items.find(x=>x.id===el.dataset.id)));',
    '}',
    'function openDecision(x){',
    '  if(!x)return;',
    '  $("inboxList").classList.add("hidden");',
    '  const d=$("inboxDecision");',
    '  d.classList.remove("hidden");',
    '  d.innerHTML="<h3>"+esc(t("inboxIncoming"))+"</h3><div class=\\"msg\\">"+esc(x.text)+"</div>"+',
    '    "<h3>"+esc(t("inboxWhy"))+"</h3><div class=\\"why\\">"+esc(x.rationale||"—")+"</div>"+',
    '    "<h3>"+esc(t("inboxDraft"))+"</h3><div class=\\"draft\\">"+esc(x.result||"—")+"</div>"+',
    '    "<div class=\\"dec-actions\\"><button class=\\"btn\\" id=\\"sendBtn\\">"+esc(t("inboxSend"))+"</button>"+',
    '    "<button class=\\"btn\\" id=\\"noSendBtn\\"><span class=\\"noSendFill\\"></span><span class=\\"noSendTxt\\">"+esc(t("inboxNoSend"))+"</span></button></div>"+',
    '    "<p class=\\"hint\\" style=\\"margin:8px 0 0\\">"+esc(t("alertDefaultHint"))+"</p>";',
    '  const fill=d.querySelector(".noSendFill");',
    '  if(fill){fill.style.animation="none";void fill.offsetWidth;fill.style.animation="";}',
    '  const timer=setTimeout(()=>decideInbox(x.id,"nosend"),10000);',
    '  d.querySelector("#sendBtn").onclick=async()=>{clearTimeout(timer);await decideInbox(x.id,"send");};',
    '  d.querySelector("#noSendBtn").onclick=async()=>{clearTimeout(timer);await decideInbox(x.id,"nosend");};',
    '}',
    'async function decideInbox(id,decision){',
    '  await api("/api/studio/send",{id,decision});',
    '  toast(decision==="send"?t("inboxSent"):t("inboxNoSendDone"));',
    '  $("inboxDecision").classList.add("hidden");',
    '  $("inboxList").classList.remove("hidden");',
    '  loadStudio();',
    '}',
    'async function loadStudio(){',
    '  const r=await api("/api/studio");',
    '  if(!r||r.error)return;',
    '  renderInbox(r.tasks||[]);',
    '}',
    '$("inboxClose").onclick=()=>{$("inboxView").style.display="none";};',
    '$("studioSubmit").onclick=',
  ].join("\n");
  j = j.slice(0, oldRender) + newBlock + j.slice(oldSubmit + '$("studioSubmit").onclick='.length);
} else fails.push("studio js block");
// the tab click opens the full-screen inbox (not a small tab)
if (j.includes('["overview","field","rules","sector","studio"].forEach(x=>$("tab-"+x).classList.add("hidden"));')) {
  j = j.replace('["overview","field","rules","sector","studio"].forEach(x=>$("tab-"+x).classList.add("hidden"));',
    '["overview","field","rules","sector","studio"].forEach(x=>$("tab-"+x).classList.add("hidden"));');
  j = j.replace('$("tab-"+b.dataset.tab).classList.remove("hidden");',
    'if(b.dataset.tab==="studio"){$("inboxView").style.display="flex";loadStudio();}else{$("tab-"+b.dataset.tab).classList.remove("hidden");}');
} else fails.push("tab open");
// auto-open the inbox when pending decisions exist on login
if (j.includes('loadShift();pollAlerts();loadStudio();loadRegister();loadMetrics($("ownerMetrics"));')) {
  j = j.replace('loadShift();pollAlerts();loadStudio();loadRegister();loadMetrics($("ownerMetrics"));',
    'loadShift();pollAlerts();loadStudio().then(()=>{api("/api/studio").then(r=>{if(r&&(r.tasks||[]).some(x=>x.status==="done"))$("inboxView").style.display="flex";});});loadRegister();loadMetrics($("ownerMetrics"));');
} else fails.push("auto-open");
fs.writeFileSync("supervisor/dashboard.html", j);

// ── i18n (tail anchor = alertDefaultHint) ───────────────────
const AD = { en: "If you do not answer, « No » applies automatically in 10 seconds.", es: "Si no respondes, « No » se aplica automáticamente en 10 segundos.", fr: "Si vous ne répondez pas, « Non » s'applique automatiquement dans 10 secondes.", de: "Wenn Sie nicht antworten, gilt « Nein » automatisch in 10 Sekunden.", it: "Se non rispondi, « No » si applica automaticamente tra 10 secondi.", pt: "Se não responder, « Não » aplica-se automaticamente em 10 segundos.", zh: "如果您不回答，「否」将在 10 秒后自动生效。", ja: "回答しない場合、10秒後に「いいえ」が自動的に適用されます。", ko: "응답하지 않으면 10초 후에 '아니요'가 자동으로 적용됩니다.", ar: "إذا لم تُجب، يُطبَّق «لا» تلقائيًا خلال 10 ثوانٍ." };
const K = {
  en: ["inboxTitle", "🔔 Notifications", "inboxDesc", "Your messages arrive here with the proposed reply and the reason behind it. You decide: send or don't send.", "inboxEmpty", "No pending decisions.", "inboxIncoming", "Message received", "inboxWhy", "Why the AI proposes this", "inboxDraft", "Proposed reply", "inboxSend", "Send", "inboxNoSend", "Don't send (default)", "inboxSent", "Sent ✔", "inboxNoSendDone", "Ignored ✔", "studioTitle", "🔔 Notifications"],
  es: ["inboxTitle", "🔔 Notificaciones", "inboxDesc", "Tus mensajes llegan aquí con la respuesta propuesta y su razón. Tú decides: enviar o no enviar.", "inboxEmpty", "Sin decisiones pendientes.", "inboxIncoming", "Mensaje recibido", "inboxWhy", "Por qué la IA propone esto", "inboxDraft", "Respuesta propuesta", "inboxSend", "Enviar", "inboxNoSend", "No enviar (predeterminado)", "inboxSent", "Enviado ✔", "inboxNoSendDone", "Ignorado ✔", "studioTitle", "🔔 Notificaciones"],
  fr: ["inboxTitle", "🔔 Notifications", "inboxDesc", "Vos messages arrivent ici avec la réponse proposée et sa raison. Vous décidez : envoyer ou ne pas envoyer.", "inboxEmpty", "Aucune décision en attente.", "inboxIncoming", "Message reçu", "inboxWhy", "Pourquoi l'IA propose cela", "inboxDraft", "Réponse proposée", "inboxSend", "Envoyer", "inboxNoSend", "Ne pas envoyer (par défaut)", "inboxSent", "Envoyé ✔", "inboxNoSendDone", "Ignoré ✔", "studioTitle", "🔔 Notifications"],
  de: ["inboxTitle", "🔔 Benachrichtigungen", "inboxDesc", "Ihre Nachrichten kommen hier an, mit der vorgeschlagenen Antwort und ihrer Begründung. Sie entscheiden: senden oder nicht.", "inboxEmpty", "Keine offenen Entscheidungen.", "inboxIncoming", "Empfangene Nachricht", "inboxWhy", "Warum die KI das vorschlägt", "inboxDraft", "Vorgeschlagene Antwort", "inboxSend", "Senden", "inboxNoSend", "Nicht senden (Standard)", "inboxSent", "Gesendet ✔", "inboxNoSendDone", "Ignoriert ✔", "studioTitle", "🔔 Benachrichtigungen"],
  it: ["inboxTitle", "🔔 Notifiche", "inboxDesc", "I tuoi messaggi arrivano qui con la risposta proposta e la sua motivazione. Decidi tu: inviare o non inviare.", "inboxEmpty", "Nessuna decisione in sospeso.", "inboxIncoming", "Messaggio ricevuto", "inboxWhy", "Perché l'IA propone questo", "inboxDraft", "Risposta proposta", "inboxSend", "Invia", "inboxNoSend", "Non inviare (predefinito)", "inboxSent", "Inviato ✔", "inboxNoSendDone", "Ignorato ✔", "studioTitle", "🔔 Notifiche"],
  pt: ["inboxTitle", "🔔 Notificações", "inboxDesc", "As suas mensagens chegam aqui com a resposta proposta e a sua razão. Você decide: enviar ou não enviar.", "inboxEmpty", "Sem decisões pendentes.", "inboxIncoming", "Mensagem recebida", "inboxWhy", "Porque a IA propõe isto", "inboxDraft", "Resposta proposta", "inboxSend", "Enviar", "inboxNoSend", "Não enviar (predefinido)", "inboxSent", "Enviado ✔", "inboxNoSendDone", "Ignorado ✔", "studioTitle", "🔔 Notificações"],
  zh: ["inboxTitle", "🔔 通知", "inboxDesc", "您的消息带着建议回复及其理由到达这里。由您决定：发送或不发送。", "inboxEmpty", "没有待处理的决定。", "inboxIncoming", "收到的消息", "inboxWhy", "AI 为何这样建议", "inboxDraft", "建议回复", "inboxSend", "发送", "inboxNoSend", "不发送（默认）", "inboxSent", "已发送 ✔", "inboxNoSendDone", "已忽略 ✔", "studioTitle", "🔔 通知"],
  ja: ["inboxTitle", "🔔 通知", "inboxDesc", "メッセージが提案された返信とその理由とともに届きます。送るか送らないかはあなたが決めます。", "inboxEmpty", "保留中の決定はありません。", "inboxIncoming", "受信メッセージ", "inboxWhy", "AIがこれを提案する理由", "inboxDraft", "提案された返信", "inboxSend", "送信", "inboxNoSend", "送信しない（既定）", "inboxSent", "送信済み ✔", "inboxNoSendDone", "無視しました ✔", "studioTitle", "🔔 通知"],
  ko: ["inboxTitle", "🔔 알림", "inboxDesc", "메시지가 제안된 답장과 그 이유와 함께 도착합니다. 보낼지 말지는 당신이 결정합니다.", "inboxEmpty", "대기 중인 결정이 없습니다.", "inboxIncoming", "받은 메시지", "inboxWhy", "AI가 이를 제안하는 이유", "inboxDraft", "제안된 답장", "inboxSend", "보내기", "inboxNoSend", "보내지 않기(기본)", "inboxSent", "보냄 ✔", "inboxNoSendDone", "무시함 ✔", "studioTitle", "🔔 알림"],
  ar: ["inboxTitle", "🔔 الإشعارات", "inboxDesc", "تصلك الرسائل هنا مع الرد المقترح وسببه. أنت من يقرر: الإرسال أو عدمه.", "inboxEmpty", "لا توجد قرارات معلقة.", "inboxIncoming", "الرسالة المستلمة", "inboxWhy", "لماذا تقترح الذكاء الاصطناعي هذا", "inboxDraft", "الرد المقترح", "inboxSend", "إرسال", "inboxNoSend", "عدم الإرسال (افتراضي)", "inboxSent", "تم الإرسال ✔", "inboxNoSendDone", "تم التجاهل ✔", "studioTitle", "🔔 الإشعارات"],
};
let d = fs.readFileSync("supervisor/dashboard.html", "utf8");
for (const [l, arr] of Object.entries(K)) {
  const anchor = 'alertDefaultHint:"' + AD[l] + '"}';
  if (d.includes(anchor)) {
    let add = "";
    for (let i = 0; i < arr.length; i += 2) add += "," + arr[i] + ":" + JSON.stringify(arr[i + 1]);
    d = d.split(anchor).join('alertDefaultHint:"' + AD[l] + '"' + add + "}");
  } else fails.push("i18n :: " + l);
}
fs.writeFileSync("supervisor/dashboard.html", d);
console.log("Inbox a pantalla completa. Pendientes:", fails.length ? fails.join(" | ") : "ninguno");
