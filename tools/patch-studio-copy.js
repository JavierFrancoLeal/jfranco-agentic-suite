// Patch: Studio = drafts + notifications; the human publishes in the native app.
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

let j = fs.readFileSync("supervisor/dashboard.html", "utf8");
const oldRender = `    const body=x.status==="done"
      ? "<b>✔</b> "+esc(name)+" — "+esc((x.result||"").slice(0,120))+" <span class=\\"hint\\">("+esc(x.by)+")</span>"
      : "<span class=\\"spin\\"></span> "+esc(name)+" — "+esc(x.text.slice(0,80))+" <span class=\\"hint\\">("+esc(x.by)+")</span>";
    return "<div class=\\"order\\"><span class=\\"txt\\" style=\\"flex:1\\">"+body+"</span></div>";`;
const newRender = `    if(x.status==="done"){
      const body="<b>✔</b> "+esc(name)+" — <i>"+esc((x.result||"").slice(0,140))+"</i> <span class=\\"hint\\">("+esc(x.by)+")</span>";
      const btn="<button class=\\"btn small\\" data-copy=\\""+esc(x.result||"")+"\\">📋 "+t("studioCopy")+"</button>";
      return "<div class=\\"order\\"><span class=\\"txt\\" style=\\"flex:1\\">"+body+"<br><span class=\\"hint\\">"+esc(t("studioPasteHint"))+"</span></span>"+btn+"</div>";
    }
    const body="<span class=\\"spin\\"></span> "+esc(name)+" — "+esc(x.text.slice(0,80))+" <span class=\\"hint\\">("+esc(x.by)+")</span>";
    return "<div class=\\"order\\"><span class=\\"txt\\" style=\\"flex:1\\">"+body+"</span></div>";`;
if (j.includes(oldRender)) {
  j = j.replace(oldRender, newRender);
} else fails.push("studio render");

// copy button: one click → clipboard → paste in the native app
const oldLoad = '    $("studioList").innerHTML=(r.tasks||[]).map(x=>{';
const newLoad = '    $("studioList").innerHTML=(r.tasks||[]).map(x=>{';
if (j.includes(oldLoad)) {
  j = j.replace('$("studioSubmit").onclick=', L2([
    '$("studioList").onclick=(ev)=>{',
    '  const btn=ev.target.closest("[data-copy]");',
    '  if(!btn)return;',
    '  try{navigator.clipboard.writeText(btn.dataset.copy).then(()=>toast(t("studioCopied")));}catch(e){toast(t("studioCopied"));}',
    '};',
    '$("studioSubmit").onclick=',
  ]));
} else fails.push("copy handler");

function L2(lines) { return lines.join("\n"); }

fs.writeFileSync("supervisor/dashboard.html", j);

// i18n (tail anchor = studioSent)
const SS = { en: "Task sent ✔", es: "Tarea enviada ✔", fr: "Tâche envoyée ✔", de: "Aufgabe gesendet ✔", it: "Compito inviato ✔", pt: "Tarefa enviada ✔", zh: "任务已发送 ✔", ja: "タスクを送信しました ✔", ko: "작업 전송 완료 ✔", ar: "تم إرسال المهمة ✔" };
const K = {
  en: ["studioCopy", "Copy", "studioCopied", "Copied ✔", "studioPasteHint", "Open your app (Facebook, Gmail…), paste the draft and send — you decide. We never touch your accounts."],
  es: ["studioCopy", "Copiar", "studioCopied", "Copiado ✔", "studioPasteHint", "Abre tu aplicación (Facebook, Gmail…), pega el borrador y envía — tú decides. Nunca tocamos tus cuentas."],
  fr: ["studioCopy", "Copier", "studioCopied", "Copié ✔", "studioPasteHint", "Ouvrez votre application (Facebook, Gmail…), collez le brouillon et envoyez — vous décidez. Nous ne touchons jamais à vos comptes."],
  de: ["studioCopy", "Kopieren", "studioCopied", "Kopiert ✔", "studioPasteHint", "Öffnen Sie Ihre App (Facebook, Gmail…), fügen Sie den Entwurf ein und senden Sie — Sie entscheiden. Wir fassen Ihre Konten nie an."],
  it: ["studioCopy", "Copia", "studioCopied", "Copiato ✔", "studioPasteHint", "Apri la tua app (Facebook, Gmail…), incolla la bozza e invia — decidi tu. Non tocchiamo mai i tuoi account."],
  pt: ["studioCopy", "Copiar", "studioCopied", "Copiado ✔", "studioPasteHint", "Abra a sua aplicação (Facebook, Gmail…), cole o rascunho e envie — você decide. Nunca tocamos nas suas contas."],
  zh: ["studioCopy", "复制", "studioCopied", "已复制 ✔", "studioPasteHint", "打开您的应用（Facebook、Gmail…），粘贴草稿并发送 — 由您决定。我们绝不触碰您的账户。"],
  ja: ["studioCopy", "コピー", "studioCopied", "コピーしました ✔", "studioPasteHint", "アプリ（Facebook、Gmail…）を開き、下書きを貼り付けて送信 — 決めるのはあなたです。私たちはあなたのアカウントには触れません。"],
  ko: ["studioCopy", "복사", "studioCopied", "복사됨 ✔", "studioPasteHint", "앱(Facebook, Gmail…)을 열고 초안을 붙여넣어 보내세요 — 결정은 당신이 합니다. 우리는 당신의 계정에 절대 손대지 않습니다."],
  ar: ["studioCopy", "نسخ", "studioCopied", "تم النسخ ✔", "studioPasteHint", "افتح تطبيقك (فيسبوك، جيميل…)، الصق المسودة وأرسل — أنت من يقرر. نحن لا نلمس حساباتك أبدًا."],
};
let d = fs.readFileSync("supervisor/dashboard.html", "utf8");
for (const [l, arr] of Object.entries(K)) {
  const anchor = 'studioSent:"' + SS[l] + '"}';
  if (d.includes(anchor)) {
    let add = "";
    for (let i = 0; i < arr.length; i += 2) add += "," + arr[i] + ":" + JSON.stringify(arr[i + 1]);
    d = d.split(anchor).join('studioSent:"' + SS[l] + '"' + add + "}");
  } else fails.push("i18n :: " + l);
}
fs.writeFileSync("supervisor/dashboard.html", d);
console.log("Studio = borradores + notificación. Pendientes:", fails.length ? fails.join(" | ") : "ninguno");
