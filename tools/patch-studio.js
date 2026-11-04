// Patch: Studio tab (Phase 1) + demo fast-access (demo-login + alert test env).
const fs = require("fs");
const fails = [];
const L = (lines) => lines.join("\n");
function patch(file, pairs) {
  let t = fs.readFileSync(file, "utf8");
  for (const [a, b] of pairs) {
    if (t.includes(a)) t = t.replace(a, b);
    else fails.push(file.slice(0, 14) + " :: " + a.slice(0, 40));
  }
  fs.writeFileSync(file, t);
}

// ── SERVER ──────────────────────────────────────────────────
patch("supervisor/server.js", [
  ['const SHIFT_FILE = path.join(DATA_DIR, "shift.json");',
   'const SHIFT_FILE = path.join(DATA_DIR, "shift.json");\nconst TASKS_FILE = path.join(DATA_DIR, "tasks.json");'],
  ['function todayStr() { return new Date().toISOString().slice(0, 10); }',
   'function todayStr() { return new Date().toISOString().slice(0, 10); }\nfunction tasksRead() { try { return JSON.parse(fs.readFileSync(TASKS_FILE, "utf8")); } catch { return { tasks: [] }; } }\nfunction tasksWrite(tk) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(TASKS_FILE, JSON.stringify(tk, null, 2)); }'],
  ['if (pathname === "/api/alerts" && req.method === "GET") {',
   'if (pathname === "/api/studio" && req.method === "GET") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const tk = tasksRead(); return send(res, 200, { tasks: tk.tasks.slice(-20).reverse() }); }\n  if (pathname === "/api/studio" && req.method === "POST") { const u = auth(req); if (!u) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const tk = tasksRead(); const id = "t" + Date.now(); tk.tasks.push({ id, type: String(b.type || "other"), text: String(b.text || ""), by: u.name, ts: ts(), status: "pending", result: null }); tasksWrite(tk); const l = liveRead(); l.inbox = l.inbox || []; l.inbox.push({ from: u.name, kind: "studio", id, text: String(b.text || "") }); liveWrite(l); return send(res, 200, { ok: true, id }); }\n  if (pathname === "/api/studio/result" && req.method === "POST") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const tk = tasksRead(); const it = tk.tasks.find((x) => x.id === b.id); if (!it) return send(res, 200, { ok: false }); it.result = String(b.result || ""); it.status = "done"; it.doneAt = ts(); tasksWrite(tk); return send(res, 200, { ok: true }); }\n  if (pathname === "/api/demo-login" && req.method === "POST") { if (process.env.DSH_DEMO_MODE !== "1") return send(res, 403, { error: "demo mode disabled" }); const b = await json(req); const u = loadUsers(); const name = Object.keys(u).find((n) => u[n].role === String(b.role || "owner")); if (!name) return send(res, 404, { error: "no demo user for that role" }); const token = issue(name, u[name].role, u[name].label || name); return send(res, 200, { token, name, role: u[name].role, label: u[name].label || name }, true); }\n  if (pathname === "/api/alerts" && req.method === "GET") {'],
]);

// ── DASHBOARD HTML: Studio tab + section ────────────────────
let h = fs.readFileSync("supervisor/dashboard.html", "utf8");
if (h.includes('<button data-tab="sector" id="tabSector">Sector</button>')) {
  h = h.replace('<button data-tab="sector" id="tabSector">Sector</button>',
    '<button data-tab="sector" id="tabSector">Sector</button>\n      <button data-tab="studio" id="tabStudio">📥 Studio</button>');
} else fails.push("tabs :: sector");
if (h.includes('<button data-tab="sector">🏪<span id="bnavSector">Sector</span></button>')) {
  h = h.replace('<button data-tab="sector">🏪<span id="bnavSector">Sector</span></button>',
    '<button data-tab="sector">🏪<span id="bnavSector">Sector</span></button>\n      <button data-tab="studio">📥<span id="bnavStudio">Studio</span></button>');
} else fails.push("bnav :: sector");
if (h.includes('<div id="tab-sector" class="hidden">')) {
  h = h.replace('<div id="tab-sector" class="hidden">',
    L([
      '<div id="tab-studio" class="hidden">',
      '  <div class="card">',
      '    <h2 id="studioTitle">📥 Studio</h2>',
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
      '<div id="tab-sector" class="hidden">',
    ]));
} else fails.push("tab-sector");
fs.writeFileSync("supervisor/dashboard.html", h);

// ── DASHBOARD JS ────────────────────────────────────────────
let j = fs.readFileSync("supervisor/dashboard.html", "utf8");
if (j.includes('["overview","field","rules","sector"].forEach(x=>$("tab-"+x).classList.add("hidden"));')) {
  j = j.replace('["overview","field","rules","sector"].forEach(x=>$("tab-"+x).classList.add("hidden"));',
    '["overview","field","rules","sector","studio"].forEach(x=>$("tab-"+x).classList.add("hidden"));');
} else fails.push("tab handler");
if (j.includes("async function loadShift(){")) {
  j = j.replace("async function loadShift(){", L([
    'const STUDIO_TYPES={social:"Social publication",email:"Email reply",quote:"Quote / bid",job:"Job posting",agenda:"Agenda & follow-ups",other:"Other"};',
    'async function loadStudio(){',
    '  const r=await api("/api/studio");',
    '  if(!r||r.error)return;',
    '  $("studioList").innerHTML=(r.tasks||[]).map(x=>{',
    '    const name=STUDIO_TYPES[x.type]||x.type;',
    '    const body=x.status==="done"',
    '      ? "<b>✔</b> "+esc(name)+" — "+esc((x.result||"").slice(0,120))+" <span class=\\"hint\\">("+esc(x.by)+")</span>"',
    '      : "<span class=\\"spin\\"></span> "+esc(name)+" — "+esc(x.text.slice(0,80))+" <span class=\\"hint\\">("+esc(x.by)+")</span>";',
    '    return "<div class=\\"order\\"><span class=\\"txt\\" style=\\"flex:1\\">"+body+"</span></div>";',
    '  }).join("")||empty("📥",t("studioEmpty"));',
    '}',
    '$("studioSubmit").onclick=async()=>{',
    '  const text=$("studioText").value.trim();',
    '  if(!text){toast(t("fillBoth"));return;}',
    '  await api("/api/studio",{type:$("studioType").value,text});',
    '  $("studioText").value="";',
    '  loadStudio();toast(t("studioSent"));',
    '};',
    'async function loadShift(){',
  ]));
} else fails.push("loadShift anchor");
if (j.includes('loadShift();pollAlerts();loadRegister();loadMetrics($("ownerMetrics"));')) {
  j = j.replace('loadShift();pollAlerts();loadRegister();loadMetrics($("ownerMetrics"));',
    'loadShift();pollAlerts();loadStudio();loadRegister();loadMetrics($("ownerMetrics"));');
} else fails.push("owner studio load");
// demo fast-access: auto-login when the URL says ?demo=<role> (demo server only)
if (j.includes('api("/api/setup-status")')) {
  j = j.replace('api("/api/setup-status")',
    '(async()=>{const dm=(/[?&]demo=([a-z]+)/.exec(location.search)||[])[1];if(dm){const r=await api("/api/demo-login",{role:dm});if(r&&r.token){token=r.token;me={name:r.name,role:r.role,label:r.label||r.name};sessionStorage.setItem("dsh-sup-token",token);sessionStorage.setItem("dsh-sup-me",JSON.stringify(me));enter();return;}}})();\napi("/api/setup-status")');
} else fails.push("demo-login anchor");
fs.writeFileSync("supervisor/dashboard.html", j);

// ── i18n (tail anchor = closeDayBtn) ────────────────────────
const CB = { en: "Close the day", es: "Cerrar la jornada", fr: "Fermer la journée", de: "Tag schließen", it: "Chiudi la giornata", pt: "Fechar a jornada", zh: "结束营业", ja: "閉店する", ko: "폐점하기", ar: "إغلاق اليوم" };
const K = {
  en: ["studioTitle", "📥 Studio", "studioHint", "Describe the task — the draft returns here for your approval.", "studioEmpty", "No tasks yet — describe one above.", "studioSent", "Task sent ✔"],
  es: ["studioTitle", "📥 Studio", "studioHint", "Describe la tarea — el borrador vuelve aquí para tu aprobación.", "studioEmpty", "Aún no hay tareas — describe una arriba.", "studioSent", "Tarea enviada ✔"],
  fr: ["studioTitle", "📥 Studio", "studioHint", "Décrivez la tâche — le brouillon revient ici pour votre approbation.", "studioEmpty", "Aucune tâche — décrivez-en une ci-dessus.", "studioSent", "Tâche envoyée ✔"],
  de: ["studioTitle", "📥 Studio", "studioHint", "Beschreiben Sie die Aufgabe — der Entwurf kommt hierher zurück.", "studioEmpty", "Noch keine Aufgaben — beschreiben Sie eine oben.", "studioSent", "Aufgabe gesendet ✔"],
  it: ["studioTitle", "📥 Studio", "studioHint", "Descrivi il compito — la bozza torna qui per la tua approvazione.", "studioEmpty", "Nessun compito — descrivine uno sopra.", "studioSent", "Compito inviato ✔"],
  pt: ["studioTitle", "📥 Studio", "studioHint", "Descreva a tarefa — o rascunho volta aqui para a sua aprovação.", "studioEmpty", "Ainda sem tarefas — descreva uma acima.", "studioSent", "Tarefa enviada ✔"],
  zh: ["studioTitle", "📥 工作室", "studioHint", "描述任务 — 草稿会回到这里供您审批。", "studioEmpty", "暂无任务 — 请在上方描述一个。", "studioSent", "任务已发送 ✔"],
  ja: ["studioTitle", "📥 スタジオ", "studioHint", "タスクを説明してください — 下書きはここに戻り、承認を待ちます。", "studioEmpty", "タスクはまだありません — 上で説明してください。", "studioSent", "タスクを送信しました ✔"],
  ko: ["studioTitle", "📥 스튜디오", "studioHint", "작업을 설명하세요 — 초안이 여기로 돌아와 승인을 기다립니다.", "studioEmpty", "아직 작업이 없습니다 — 위에서 설명하세요.", "studioSent", "작업 전송 완료 ✔"],
  ar: ["studioTitle", "📥 الاستوديو", "studioHint", "صِف المهمة — يعود المسودة هنا لموافقتك.", "studioEmpty", "لا توجد مهام بعد — صِف واحدة أعلاه.", "studioSent", "تم إرسال المهمة ✔"],
};
let d = fs.readFileSync("supervisor/dashboard.html", "utf8");
for (const [l, arr] of Object.entries(K)) {
  const anchor = 'closeDayBtn:"' + CB[l] + '"}';
  if (d.includes(anchor)) {
    let add = "";
    for (let i = 0; i < arr.length; i += 2) add += "," + arr[i] + ":" + JSON.stringify(arr[i + 1]);
    d = d.split(anchor).join('closeDayBtn:"' + CB[l] + '"' + add + "}");
  } else fails.push("i18n :: " + l);
}
fs.writeFileSync("supervisor/dashboard.html", d);

// ── demo launch: demo mode + alert test ─────────────────────
let sh = fs.readFileSync("tools/demo-sandbox.sh", "utf8");
if (sh.includes('nohup env DSH_SUPERVISOR_DATA="$DEMO" DSH_SUPERVISOR_PORT="$PORT" caffeinate')) {
  sh = sh.replace('nohup env DSH_SUPERVISOR_DATA="$DEMO" DSH_SUPERVISOR_PORT="$PORT" caffeinate',
    'nohup env DSH_SUPERVISOR_DATA="$DEMO" DSH_SUPERVISOR_PORT="$PORT" DSH_DEMO_MODE=1 DSH_ALERT_TEST=1 caffeinate');
  fs.writeFileSync("tools/demo-sandbox.sh", sh);
} else fails.push("demo-sandbox envs");

console.log("Studio + demo access. Pendientes:", fails.length ? fails.join(" | ") : "ninguno");
