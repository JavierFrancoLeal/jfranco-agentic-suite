// Patch: kitchen connection (studio inbox + demo auto-draft) + alert bar redesign.
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

// ── SERVER: studio inbox (agent-facing) + demo auto-draft ────
patch("supervisor/server.js", [
  ['if (pathname === "/api/studio/result" && req.method === "POST") {',
   'if (pathname === "/api/studio/inbox" && req.method === "GET") { const l = liveRead(); const tk = tasksRead(); const doneIds = new Set(tk.tasks.filter((x) => x.status === "done").map((x) => x.id)); const items = (l.inbox || []).filter((x) => x.kind === "studio" && !doneIds.has(x.id)); return send(res, 200, { items }, true); }\n  if (pathname === "/api/studio/result" && req.method === "POST") {'],
  ['if (pathname === "/api/studio" && req.method === "POST") { const u = auth(req); if (!u) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const tk = tasksRead(); const id = "t" + Date.now(); tk.tasks.push({ id, type: String(b.type || "other"), text: String(b.text || ""), by: u.name, ts: ts(), status: "pending", result: null }); tasksWrite(tk); const l = liveRead(); l.inbox = l.inbox || []; l.inbox.push({ from: u.name, kind: "studio", id, text: String(b.text || "") }); liveWrite(l); return send(res, 200, { ok: true, id }); }',
   'if (pathname === "/api/studio" && req.method === "POST") { const u = auth(req); if (!u) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const tk = tasksRead(); const id = "t" + Date.now(); tk.tasks.push({ id, type: String(b.type || "other"), text: String(b.text || ""), by: u.name, ts: ts(), status: "pending", result: null }); tasksWrite(tk); const l = liveRead(); l.inbox = l.inbox || []; l.inbox.push({ from: u.name, kind: "studio", id, text: String(b.type || "") + " :: " + String(b.text || "") }); liveWrite(l); if (process.env.DSH_DEMO_MODE === "1") setTimeout(() => { const t2 = tasksRead(); const it = t2.tasks.find((x) => x.id === id); if (it && it.status === "pending") { it.result = "[Brouillon de démonstration — " + String(b.type || "autre") + "] " + String(b.text || ""); it.status = "done"; it.doneAt = ts(); tasksWrite(t2); } }, 3000); return send(res, 200, { ok: true, id }); }'],
]);

// ── AGENT: the drafts-kitchen branch ─────────────────────────
patch("tools/agent-standby.sh", [
  ['  [ -n "$ONCE" ] && exit 0',
   `  # ---- STUDIO: drafts for the owner (one app, invisible kitchen) ----
  SITEMS="\$(items_json "\$SUP/api/studio/inbox")"
  SN="\$(count_of "\$SITEMS")"
  if [ "\$SN" != "0" ]; then
    STXT="\$(echo "\$SITEMS" | "\$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.items.map(x=>x.id+" ::: "+x.text).join("\\n"))}catch(e){console.log("")}})')"
    SPROMPT="Drafts kitchen (Studio, Trasunto). The owner asked these tasks (each line: id ::: type :: request): \$STXT Draft each one in professional French, short and ready to publish/send. Then for EACH task POST the draft as JSON to \$SUP/api/studio/result with this shape: {\\"id\\":\\"<the task id>\\",\\"result\\":\\"<your draft>\\"}. Finally reply one line: drafts posted."
    echo "[\$(date +%H:%M:%S)] \$SN studio task(s) → drafting…"
    if [ -n "\$DRY" ]; then
      echo "   would run: \$DSH --profile campo headless \"\$SPROMPT\""
    else
      "\$DSH" --profile campo headless "\$SPROMPT" >/dev/null 2>&1 || echo "   (studio run failed — check DEEPSEEK_API_KEY)"
    fi
  fi

  [ -n "\$ONCE" ] && exit 0`],
]);

// ── DASHBOARD: alert bar redesign (Yes plain white; No = discharging frosted fill; hint line) ──
let h = fs.readFileSync("supervisor/dashboard.html", "utf8");
if (h.includes('<div class="alert-actions">')) {
  h = h.replace('<div class="alert-actions">',
    '<div class="alert-actions">');
  h = h.replace('<button class="btn small gray" id="alertNo">Non (par défaut · 10 s)</button>',
    '<button class="btn small" id="alertNo"><span class="alertNoFill"></span><span class="alertNoTxt">Non (par défaut)</span></button>');
  h = h.replace('</div>\n    <div class="alert-cd"><div id="alertCdown"></div></div>',
    '</div>\n    <p class="hint" id="alertHint" style="margin:6px 0 0"></p>');
} else fails.push("alert actions");
const oldCss = '#alertCdown{height:4px;width:100%;background:#4D6BFE;animation:cdown 10s linear forwards}\n@keyframes cdown{from{width:100%}to{width:0}}\n@media(prefers-reduced-motion:reduce){#alertCdown{animation:none;width:0}}';
const newCss = '#alertYes{background:#fff;color:#111827;border:1px solid #E5E7EB;box-shadow:none}\n#alertNo{position:relative;overflow:hidden;background:#F3F4F6;color:#111827;border:1px solid #E5E7EB;box-shadow:none}\n.alertNoTxt{position:relative;z-index:2}\n.alertNoFill{position:absolute;inset:0;z-index:1;background:rgba(107,114,128,.38);backdrop-filter:blur(1.5px);-webkit-backdrop-filter:blur(1.5px);transform-origin:left;animation:noFill 10s linear forwards}\n@keyframes noFill{from{transform:scaleX(1)}to{transform:scaleX(0)}}\n@media(prefers-reduced-motion:reduce){.alertNoFill{animation:none;transform:scaleX(0)}}';
if (h.includes(oldCss)) h = h.replace(oldCss, newCss);
else fails.push("alert css");
fs.writeFileSync("supervisor/dashboard.html", h);

// JS: retrigger the fill + the hint text
let j = fs.readFileSync("supervisor/dashboard.html", "utf8");
if (j.includes('const cd=$("alertCdown");')) {
  j = j.replace('  const cd=$("alertCdown");\n  cd.style.animation="none";void cd.offsetWidth;cd.style.animation="";',
    '  $("alertHint").textContent=t("alertDefaultHint");\n  const fill=document.querySelector("#alertNo .alertNoFill");\n  if(fill){fill.style.animation="none";void fill.offsetWidth;fill.style.animation="";}');
} else fails.push("alert js");
fs.writeFileSync("supervisor/dashboard.html", j);

// i18n (tail anchor = studioPasteHint)
const SP = { en: "Open your app (Facebook, Gmail…), paste the draft and send — you decide. We never touch your accounts.", es: "Abre tu aplicación (Facebook, Gmail…), pega el borrador y envía — tú decides. Nunca tocamos tus cuentas.", fr: "Ouvrez votre application (Facebook, Gmail…), collez le brouillon et envoyez — vous décidez. Nous ne touchons jamais à vos comptes.", de: "Öffnen Sie Ihre App (Facebook, Gmail…), fügen Sie den Entwurf ein und senden Sie — Sie entscheiden. Wir fassen Ihre Konten nie an.", it: "Apri la tua app (Facebook, Gmail…), incolla la bozza e invia — decidi tu. Non tocchiamo mai i tuoi account.", pt: "Abra a sua aplicação (Facebook, Gmail…), cole o rascunho e envie — você decide. Nunca tocamos nas suas contas.", zh: "打开您的应用（Facebook、Gmail…），粘贴草稿并发送 — 由您决定。我们绝不触碰您的账户。", ja: "アプリ（Facebook、Gmail…）を開き、下書きを貼り付けて送信 — 決めるのはあなたです。私たちはあなたのアカウントには触れません。", ko: "앱(Facebook, Gmail…)을 열고 초안을 붙여넣어 보내세요 — 결정은 당신이 합니다. 우리는 당신의 계정에 절대 손대지 않습니다.", ar: "افتح تطبيقك (فيسبوك، جيميل…)، الصق المسودة وأرسل — أنت من يقرر. نحن لا نلمس حساباتك أبدًا." };
const K = {
  en: ["alertDefaultHint", "If you do not answer, « No » applies automatically in 10 seconds."],
  es: ["alertDefaultHint", "Si no respondes, « No » se aplica automáticamente en 10 segundos."],
  fr: ["alertDefaultHint", "Si vous ne répondez pas, « Non » s'applique automatiquement dans 10 secondes."],
  de: ["alertDefaultHint", "Wenn Sie nicht antworten, gilt « Nein » automatisch in 10 Sekunden."],
  it: ["alertDefaultHint", "Se non rispondi, « No » si applica automaticamente tra 10 secondi."],
  pt: ["alertDefaultHint", "Se não responder, « Não » aplica-se automaticamente em 10 segundos."],
  zh: ["alertDefaultHint", "如果您不回答，「否」将在 10 秒后自动生效。"],
  ja: ["alertDefaultHint", "回答しない場合、10秒後に「いいえ」が自動的に適用されます。"],
  ko: ["alertDefaultHint", "응답하지 않으면 10초 후에 '아니요'가 자동으로 적용됩니다."],
  ar: ["alertDefaultHint", "إذا لم تُجب، يُطبَّق «لا» تلقائيًا خلال 10 ثوانٍ."],
};
let d = fs.readFileSync("supervisor/dashboard.html", "utf8");
for (const [l, arr] of Object.entries(K)) {
  const anchor = 'studioPasteHint:"' + SP[l] + '"}';
  if (d.includes(anchor)) {
    let add = "";
    for (let i = 0; i < arr.length; i += 2) add += "," + arr[i] + ":" + JSON.stringify(arr[i + 1]);
    d = d.split(anchor).join('studioPasteHint:"' + SP[l] + '"' + add + "}");
  } else fails.push("i18n :: " + l);
}
fs.writeFileSync("supervisor/dashboard.html", d);
console.log("cocina + barra rediseñada. Pendientes:", fails.length ? fails.join(" | ") : "ninguno");
