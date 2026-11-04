// Patch: the Notifications bell at the top of the app (always visible + red badge).
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

let h = fs.readFileSync("supervisor/dashboard.html", "utf8");
if (h.includes('<button class="btn small gray" id="soundBtn">🔊</button>')) {
  h = h.replace('<button class="btn small gray" id="soundBtn">🔊</button>',
    '<button class="btn small gray" id="notifBell" title="Notifications" style="position:relative">🔔<span id="notifBadge" class="hidden" style="position:absolute;top:-7px;right:-7px;background:#ef4444;color:#fff;border-radius:999px;min-width:19px;height:19px;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 4px;box-shadow:0 2px 6px rgba(239,68,68,.5)">0</span></button>\n  <button class="btn small gray" id="soundBtn">🔊</button>');
} else fails.push("bell html");
fs.writeFileSync("supervisor/dashboard.html", h);

let j = fs.readFileSync("supervisor/dashboard.html", "utf8");
// badge refresh + bell wiring (before loadRegister)
if (j.includes("async function loadStudio(){")) {
  j = j.replace("async function loadStudio(){", [
    'async function refreshNotifBadge(){',
    '  try{',
    '    const r=await api("/api/studio");',
    '    if(!r||r.error)return;',
    '    const n=(r.tasks||[]).filter(x=>x.status==="done").length;',
    '    const b=$("notifBadge");',
    '    if(n>0){b.textContent=n;b.classList.remove("hidden");}else b.classList.add("hidden");',
    '  }catch(e){}',
    '}',
    '$("notifBell").onclick=()=>{$("inboxView").style.display="flex";loadStudio();};',
    'setInterval(refreshNotifBadge,30000);',
    'async function loadStudio(){',
  ].join("\n"));
} else fails.push("bell js");
// show the bell for owner/lead; refresh after each inbox change
if (j.includes('$("logoutBtn").style.display=me?"inline-block":"none";')) {
  j = j.replace('$("logoutBtn").style.display=me?"inline-block":"none";',
    '$("logoutBtn").style.display=me?"inline-block":"none";$("notifBell").style.display=(me&&(me.role==="owner"||me.role==="lead"))?"inline-block":"none";');
} else fails.push("setWho bell");
if (j.includes('async function loadStudio(){\n  const r=await api("/api/studio");\n  if(!r||r.error)return;\n  renderInbox(r.tasks||[]);\n}')) {
  j = j.replace('async function loadStudio(){\n  const r=await api("/api/studio");\n  if(!r||r.error)return;\n  renderInbox(r.tasks||[]);\n}',
    'async function loadStudio(){\n  const r=await api("/api/studio");\n  if(!r||r.error)return;\n  renderInbox(r.tasks||[]);\n  refreshNotifBadge();\n}');
} else fails.push("loadStudio badge");
if (j.includes('loadShift();pollAlerts();loadStudio().then(()=>{api("/api/studio").then(r=>{if(r&&(r.tasks||[]).some(x=>x.status==="done"))$("inboxView").style.display="flex";});});loadRegister();')) {
  j = j.replace('loadStudio().then(()=>{api("/api/studio").then(r=>{if(r&&(r.tasks||[]).some(x=>x.status==="done"))$("inboxView").style.display="flex";});});',
    'loadStudio().then(()=>{refreshNotifBadge();api("/api/studio").then(r=>{if(r&&(r.tasks||[]).some(x=>x.status==="done"))$("inboxView").style.display="flex";});});');
} else fails.push("owner bell refresh");
fs.writeFileSync("supervisor/dashboard.html", j);
console.log("campana arriba. Pendientes:", fails.length ? fails.join(" | ") : "ninguno");
