// Le Veilleux dashboard logic — stage 2 of the structural refactor.
// Extracted from dashboard.html. i18n comes from i18n.js (global S).
"use strict";
const LANG={es:"ES",en:"EN",fr:"FR",de:"DE",it:"IT",pt:"PT",zh:"中文",ja:"日本語",ko:"한국어",ar:"العربية"};

function haptic(){try{if(navigator.vibrate)navigator.vibrate(25);}catch(e){}if(soundOn){try{const C=window.AudioContext||window.webkitAudioContext;if(!window.__ac)window.__ac=new C();const c=window.__ac;const o=c.createOscillator(),g=c.createGain();o.frequency.value=880;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.12,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.12);o.start();o.stop(c.currentTime+.12);}catch(e){}}}
const $=id=>document.getElementById(id);
let token=null,me=null,auto=false,cur="en",livePoll=null,PACK=null,recording=false,rec=null,soundOn=true,darkOn=false,kitchenPoll=null,lastOrders=0;
function t(k){return (S[cur]&&S[cur][k])||S.en[k]||k;}
function applyToggles(){document.body.classList.toggle("dark",darkOn);$("darkBtn").textContent=darkOn?"☀️":"🌙";$("soundBtn").textContent=soundOn?"🔊":"🔇";}
$("darkBtn").onclick=()=>{darkOn=!darkOn;try{localStorage.setItem("dsh-dark",darkOn?"1":"0");}catch(e){}applyToggles();};
$("soundBtn").onclick=()=>{soundOn=!soundOn;try{localStorage.setItem("dsh-sound",soundOn?"1":"0");}catch(e){}applyToggles();};
try{darkOn=localStorage.getItem("dsh-dark")==="1";soundOn=localStorage.getItem("dsh-sound")!=="0";}catch(e){}
applyToggles();
document.body.classList.add("loginpage");
const firstRun=(()=>{try{return !localStorage.getItem("dsh-lang");}catch(e){return true;}})();
if(firstRun){
  $("splash").style.display="none";
  $("loginView").style.display="none";
  document.body.classList.add("firstboot");
  $("langStep").style.display="flex";
}else{
  setTimeout(()=>{$("splash").classList.add("done");},1300);
}
async function reRenderDynamic(){
  if(!me)return;
  if(me.role==="owner"){loadMetrics($("ownerMetrics"));loadUsers();loadUsage();loadField();renderOrders();renderSuggest();}
  else if(me.role==="lead"){loadMetrics($("leadMetrics"));loadLead();renderOrders();}
  else{$("workerHi").textContent=t("hi")+(me.label||me.name);workerFlow();}
  if(location.search.indexOf("wall=1")>=0)wallTick();
}
async function kitchenWatch(){
  const live=await api("/api/live");
  const n=(live.orders||[]).length;
  if(n>lastOrders&&lastOrders>0){
    const o=live.orders[n-1];
    $("kitchenBanner").textContent="🔔 "+t("newOrder")+": "+o.person+" — "+o.request;
    $("kitchenBanner").classList.remove("hidden");
    haptic();
    try{if("Notification" in window&&Notification.permission==="granted"){new Notification(t("newOrder"),{body:o.person+" — "+o.request});}}catch(e){}
    setTimeout(()=>$("kitchenBanner").classList.add("hidden"),6000);
  }
  lastOrders=n;
}
$("notifBtn").onclick=()=>{
  try{
    if("Notification" in window&&Notification.permission!=="granted"){
      Notification.requestPermission().then(()=>{renderOrders();});
    }
  }catch(e){}
};
async function doExport(type){
  try{
    const r=await fetch("/api/export?type="+type,{headers:{"Authorization":"Bearer "+token}});
    if(!r.ok){toast("Error");return;}
    const blob=await r.blob();
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    const cd=r.headers.get("Content-Disposition")||"";
    const m=/filename="?([^";]+)"?/.exec(cd);
    a.download=m?m[1]:("le-veilleux-"+type+".md");
    document.body.appendChild(a);a.click();a.remove();
    toast(t("exportDone"));
  }catch(e){toast(t("cannotReach"));}
}
async function loadRegister(){
  const r=await api("/api/register");
  if(!r||r.error)return;
  const open=r.status==="open";
  $("regClosed").classList.toggle("hidden",open);
  $("regOpenState").classList.toggle("hidden",!open);
  if(open){
    $("regItems").textContent=(r.items||[]).map(x=>x.name+" — $"+x.price).join(" · ");
    const cur=Math.round((r.items||[]).reduce((a,x)=>a+x.price,0)*100)/100;
    $("regTotal").textContent=t("regTotal")+": $"+cur;
  }
  if(me&&me.role==="owner"){
    if(r.status==="closed"){
      $("regDay").innerHTML='<p class="note">'+t("regRecorded")+": $"+r.recorded+" · "+t("regDeclared2")+": $"+(r.declared==null?"—":r.declared)+'</p><p class="note" style="'+(r.variance!==null&&Math.abs(r.variance)>0.01?"color:#b45309;font-weight:700":"")+'">'+t("regVariance")+": $"+(r.variance==null?"—":r.variance)+'</p>';
    } else {
      $("regDay").innerHTML='<p class="hint">—</p>';
    }
    renderRegSales(r);
  }
  if(me&&me.role==="employee"){$("regCount").textContent=(r.sales||[]).length+" "+t("salesToday");}
  try{api("/api/health").then(hp=>{if(hp&&hp.version)$("verBadge").textContent="supervisor v"+hp.version+" · app 0.1.0 · dsh "+((hp.workers!==undefined)?"":"")+"runtime";});}catch(e){}
}
function renderRegSales(r){
  const q=($("regSearch").value||"").toLowerCase();
  const m=$("regMethod").value;
  const list=(r.sales||[]).slice().reverse().filter(x=>{
    if(m!=="all"&&x.method!==m)return false;
    if(q&&!(x.items||[]).some(it=>it.name.toLowerCase().indexOf(q)>=0))return false;
    return true;
  });
  $("regSales").innerHTML=list.length?list.map(x=>'<div class="order"><b>'+esc(x.ts.slice(11,16))+'</b><span class="txt">'+esc((x.items||[]).map(it=>it.name).join(", "))+' · '+esc(x.worker||"?")+'</span><span class="stat">$ '+x.total+'</span></div>').join(""):empty("🧾","—");
}
$("regSearch").oninput=()=>{api("/api/register").then(renderRegSales);};
$("regMethod").onchange=()=>{api("/api/register").then(renderRegSales);};
$("regOpen").onclick=async()=>{await api("/api/register/open",{worker:me?me.name:"worker"});loadRegister();};
$("regAdd").onclick=async()=>{const n=$("regItem").value.trim();const p=$("regPrice").value;if(!n||!p)return;await api("/api/register/add",{name:n,price:Number(p)});$("regItem").value="";$("regPrice").value="";loadRegister();};
$("regSale").onclick=async()=>{await api("/api/register/charge",{method:$("regSaleMethod").value});loadRegister();toast(t("regSale"));};
$("regClose").onclick=async()=>{await api("/api/register/close",{declared:Number($("regDeclared").value)||0});loadRegister();};
$("exportRegisterBtn").onclick=()=>doExport("register");
$("deepSend").onclick=async()=>{const v=$("deepText").value.trim();if(!v)return;const r=await api("/api/deep",{worker:me?me.name:"owner",text:v});if(r.error){toast(String(r.error).indexOf("budget")>=0?t("budgetReached"):"Error");return;}$("deepText").value="";toast(t("deepSent"));};
$("exportBtn").onclick=()=>doExport("reports");
$("exportOrdersBtn").onclick=()=>doExport("orders");
function panelLinks(){const u=me?encodeURIComponent(me.name):"",r=me?encodeURIComponent(me.role):"",lb=me?encodeURIComponent(me.label||me.name):"";$("openPanelLink").setAttribute("href","/panel?user="+u+"&role="+r+"&label="+lb+"&lang="+cur);$("leadOpenPanelLink").setAttribute("href","/panel?user="+u+"&role="+r+"&label="+lb+"&lang="+cur);}
function applyLang(){
  // (the language is persisted only on an explicit human choice)
  $("welcomeClose").onclick=()=>{$("welcomeCard").style.display="none";try{localStorage.setItem("lv-welcome","1");}catch(e){}};
  $("splashTag").textContent=t("tagline");
  $("welcomeTitle").textContent=t("welcomeTitle");$("welcomeBody").textContent=t("welcomeBody");$("wallNote").textContent=t("wallNote");
  $("setupUser").placeholder=t("setupUser");$("setupPass").placeholder=t("setupPass");$("setupBtn").textContent=t("setupBtn");$("setupHint").textContent=t("setupHint");
  $("loginTitle").textContent=t("login");$("tagline").textContent=t("tagline");$("loginUser").placeholder=t("user");
["loginUser","loginPass"].forEach(id=>$(id).addEventListener("input",()=>$("loginError").classList.add("hidden")));$("loginPass").placeholder=t("password");
  $("loginBtn").textContent=t("loginBtn");$("loginHint").textContent=t("loginHint");$("openWall").textContent=t("wallOpen");$("logoutBtn").textContent=t("logout");
  $("tabOverview").textContent=t("overview");$("tabField").textContent=t("field");$("tabRules").textContent=t("rules");
  $("workersTitle").textContent=t("workers");$("thUser").textContent=t("thUser");$("thRole").textContent=t("thRole");
  $("addWorkerTitle").textContent=t("addWorker");$("newUser").placeholder=t("userName");$("addUserBtn").textContent=t("addBtn");
  $("ordersTitle").textContent=t("ordersTitle");$("leadOrdersTitle").textContent=t("ordersTitle");$("ordersTitle2").textContent=t("ordersTitle");
  $("usageTitle").textContent=t("usage");$("usageSub").textContent=t("usageSub");
  $("thWorker").textContent=t("thWorker");$("thSessions").textContent=t("thSessions");$("thTokens").textContent=t("thTokens");$("thCost").textContent=t("thCost");
  $("panelTitle").textContent=t("panel");$("panelNote").textContent=t("panelNote");$("openPanel").textContent=t("openPanel");
  $("fieldReportsTitle").textContent=t("fieldReports");$("feedbackTitle").textContent=t("feedbackQueue");$("feedbackHint").textContent=t("feedbackHint");
  $("regSearch").placeholder=t("regSearch");$("regMethod").options[0].textContent=t("allMethods");$("regMethod").options[1].textContent=t("cash");$("regMethod").options[2].textContent=t("card");$("regMethod").options[3].textContent=t("terminal");$("regSaleMethod").options[0].textContent=t("terminal");$("regSaleMethod").options[1].textContent=t("cash");$("regSaleMethod").options[2].textContent=t("card");
  $("regTitle").textContent=t("regTitle");$("regOpen").textContent=t("regOpen");$("regItem").placeholder=t("regItem");$("regPrice").placeholder=t("regPrice");$("regAdd").textContent=t("regAdd");$("regSale").textContent=t("regSale");$("regHint").textContent=t("regHint");$("regClose").textContent=t("regClose");$("regDeclared").placeholder=t("regDeclared");$("regDayTitle").textContent=t("regDayTitle");$("exportRegisterBtn").textContent=t("exportReg");
  $("deepTitle").textContent=t("deepTitle");$("deepText").placeholder=t("deepPh");$("deepSend").textContent=t("deepSend");$("deepHint").textContent=t("deepHint");
  $("refreshReports").textContent=t("refresh");$("exportBtn").textContent=t("export");$("exportOrdersBtn").textContent=t("exportOrders");if(!auto)$("autoRefresh").textContent=t("autoOff");
  $("rulesTitle").textContent=t("rulesTitle");$("rulesHint").textContent=t("rulesHint");$("saveDecisions").textContent=t("saveRules");
  $("leadReportsTitle").textContent=t("fieldReports");$("leadFeedbackTitle").textContent=t("feedbackQueue");$("leadRefresh").textContent=t("refresh");$("leadOpenPanel").textContent=t("openPanel");
  $("startBtn").textContent=t("start");$("listeningText").textContent=t("listening");$("listeningHint").textContent=t("listeningHint");
  $("stopBtn").textContent=t("stopListening");$("summaryTitle").textContent=t("summaryTitle");$("newConvBtn").textContent=t("newConv");$("toHomeBtn").textContent=t("back");
  $("reportTitle").textContent=t("reportTitle");$("reportText").placeholder=t("reportPh");$("reportBtn").textContent=t("sendReport");
  $("fbTitle").textContent=t("fbTitle");$("empFbText").placeholder=t("fbPh");$("empFbBtn").textContent=t("sendFeedback");$("switchBtn").textContent=t("switchUser");
  $("wallPulseTitle").textContent=t("wallPulse");
  $("notifBtn").textContent=t("enableNotif");$("notifHint").textContent=t("notifHint");
  $("optEmployee").textContent=t("lvlEmployee");$("optLead").textContent=t("lvlLead");$("optOwner").textContent=t("lvlOwner");$("newLabel").placeholder=t("labelPh");
  $("tabSector").textContent=t("sectorTab");$("bnavOverview").textContent=t("overview");$("bnavField").textContent=t("field");$("bnavRules").textContent=t("rules");$("bnavSector").textContent=t("sectorTab");$("sectorPresetsTitle").textContent=t("sectorPresets");$("customSectorTitle").textContent=t("customSector");$("saveSectorBtn").textContent=t("saveSector");$("aiSectorBtn").textContent=t("aiSuggest");
  $("trailTitle").textContent=t("conversationTrail");$("trailHint").textContent=t("trailHint");
  $("sayText").placeholder=t("sayPh");$("sayBtn").textContent=t("sendPhrase");$("aiHint").textContent=t("aiHint");if(!recording)$("micBtn").textContent=t("dictate");
  document.querySelectorAll(".pill").forEach(p=>p.classList.toggle("active",p.dataset.l===cur));
  panelLinks();
  reRenderDynamic();
}
const LANGNAMES={es:"Español",en:"English",fr:"Français",de:"Deutsch",it:"Italiano",pt:"Português",zh:"中文",ja:"日本語",ko:"한국어",ar:"العربية"};
const LANGORDER=["it","zh","de","es","en","fr","ja","pt","ko","ar"];
function buildLangMenu(){
  const rows=$("langRows");
  for(const l of LANGORDER){
    const r=document.createElement("div");
    r.className="orow"+(l==="en"?" center":"");
    r.innerHTML='<span>'+LANGNAMES[l]+'</span><span class="sub">'+l.toUpperCase()+'</span>';
    r.onclick=()=>{cur=l;try{localStorage.setItem("dsh-lang",cur);}catch(e){}applyLang();$("langOverlay").style.display="none";markReel();$("langStep").classList.add("done");const sp=$("splash");sp.classList.remove("done");const p=sp.querySelector(".draw");if(p){p.style.animation="none";void p.offsetWidth;p.style.animation="";}setTimeout(()=>{$("loginView").style.display="";document.body.classList.remove("firstboot");},2100);setTimeout(()=>{sp.classList.add("done");},2600);};
    rows.appendChild(r);
  }
}
function markReel(){
  document.querySelectorAll("#langStepTicks .tick").forEach(t=>t.classList.toggle("active",t.dataset.l===cur));
}
function buildReel(ticksId){
  for(let pass=0;pass<2;pass++){
    for(const l of Object.keys(LANG)){
      const d=document.createElement("div");
      d.className="tick";d.dataset.l=l;d.textContent=LANGNAMES[l];
      $(ticksId).appendChild(d);
    }
  }
  const N=Object.keys(LANG).length,H=58,CYCLE=20000;
  const t0=performance.now();
  (function frame(now){
    const t=(now-t0)%CYCLE;
    $(ticksId).style.transform="translateY(-"+((t/CYCLE)*N*H)+"px)";
    requestAnimationFrame(frame);
  })(t0);
}
buildLangMenu();
buildReel("langStepTicks");
markReel();
$("langStepReel").onclick=()=>{$("langOverlay").style.display="flex";const en=document.querySelector("#langRows .center");if(en)en.scrollIntoView({block:"center"});};
$("closeOverlay").onclick=()=>{$("langOverlay").style.display="none";};
// The Apple flow: after the splash, the language menu opens once (until chosen).

function pill(l){for(const host of ["footLangs"]){const el=$(host);if(!el)continue;const b=document.createElement("button");b.className="pill";b.dataset.l=l;b.textContent=LANG[l];b.onclick=()=>{cur=l;try{localStorage.setItem("dsh-lang",cur);}catch(e){}applyLang();};$(host).appendChild(b);}}
for(const l of Object.keys(LANG))pill(l);
try{const q=new URLSearchParams(location.search);const ql=q.get("lang");if(ql&&S[ql])cur=ql;}catch(e){}
try{const saved=localStorage.getItem("dsh-lang");if(saved&&S[saved])cur=saved;}catch(e){}
applyLang();
function applyPack(){if(!PACK)return;$("tableInput").placeholder=(PACK.tableLabel&&PACK.tableLabel[cur])||"Table";const ot=(PACK.ordersTarget&&PACK.ordersTarget[cur])||t("ordersTitle");$("ordersTitle").textContent=ot;$("leadOrdersTitle").textContent=ot;$("ordersTitle2").textContent=ot;}
const api=async(p,body)=>{try{const r=await fetch(p,{method:body?"POST":"GET",headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:body?JSON.stringify(body):undefined});return r.json();}catch(e){return {error:"network"};}};
function show(view){["loginView","ownerView","leadView","employeeView","wallView"].forEach(v=>$(v).classList.add("hidden"));const el=$(view);el.classList.remove("hidden");el.classList.remove("anim");void el.offsetWidth;el.classList.add("anim");document.body.classList.toggle("loginpage",view==="loginView");}
const LVL={employee:"lvlEmployee",lead:"lvlLead",owner:"lvlOwner"};
function setWho(){const w=$("who");w.textContent=me?(me.label||me.name):"";const c=$("idChip");if(me){c.style.display="inline-block";c.textContent=me.name.slice(0,1).toUpperCase()+" · "+(me.label||me.name)+" · "+t(LVL[me.role]||"lvlEmployee");}else{c.style.display="none";}$("logoutBtn").style.display=me?"inline-block":"none";}
function toast(m){const el=$("toast");el.textContent=m;el.classList.add("show");clearTimeout(el.__t);el.__t=setTimeout(()=>el.classList.remove("show"),2200);}
function skel(n){let out="";for(let i=0;i<n;i++)out+='<div class="skel" style="height:38px;margin:8px 0"></div>';return out;}
const esc=(s)=>String(s==null?"":s).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function empty(ico,txt){return '<div class="empty"><span class="ico">'+ico+'</span>'+txt+'</div>';}
function showMsg(x){$("msg").textContent=x;toast(x);setTimeout(()=>$("msg").textContent="",2500);}
function countUp(el,target,dur){dur=dur||650;const t0=performance.now();const step=(now)=>{const p=Math.min(1,(now-t0)/dur);el.textContent=Math.round(target*p).toLocaleString();if(p<1)requestAnimationFrame(step);};requestAnimationFrame(step);}
async function loadMetrics(into){into.innerHTML=skel(2);const m=await api("/api/metrics");into.innerHTML="";const cards=[[t("reports"),m.reports],[t("week"),m.reportsWeek],[t("feedback"),m.feedback],[t("workersActive"),m.workers]];for(const [l,v] of cards){const d=document.createElement("div");d.className="metric";d.innerHTML='<div class="v">–</div><div class="l">'+l+'</div>';into.appendChild(d);if(typeof v==="number")countUp(d.querySelector(".v"),v);}}
async function loadUsage(){const tb=$("usageTable")?$("usageTable").querySelector("tbody"):null;if(!tb)return;tb.innerHTML='<tr><td colspan="4">'+skel(2)+'</td></tr>';const r=await api("/api/usage");tb.innerHTML="";
  if(!(r.rows||[]).length){tb.innerHTML='<tr><td colspan="4">'+empty("📊",t("noUsage"))+'</td></tr>';return;}
  (r.rows||[]).forEach(x=>{const tr=document.createElement("tr");tr.innerHTML="<td>"+esc(x.worker)+"</td><td>"+x.sessions+"</td><td>"+(x.tokens||0).toLocaleString()+"</td><td>$"+(x.cost||0).toFixed(2)+"</td>";tb.appendChild(tr);});try{const hp=await api("/api/health");if(hp&&hp.budgetUsd!==undefined){const spent=hp.spentTodayUsd||0;if(hp.budgetUsd>0){const pct=hp.budgetPct||0;$("usageBudget").textContent=t("budget")+": $"+spent+" / $"+hp.budgetUsd+" ("+pct+"%)";$("usageBudget").style.color=pct>=80?"#b45309":"";}else{$("usageBudget").textContent=t("budget")+": $"+spent+" ∞";$("usageBudget").style.color="";}}}catch(e){}}
function orderRow(o,canUpdate){
  const d=document.createElement("div");d.className="order";
  const stat=document.createElement("span");stat.className="stat";const ICON={sent:"📤",prep:"🍳",ready:"✅",delivered:"🛎️"};
  stat.textContent=(ICON[o.status]||"📤")+" "+t(o.status||"sent");
  if(o.paid){const p=document.createElement("span");p.className="stat";p.style.background="#dcfce7";p.style.color="#15803d";p.textContent=t("paid");d.appendChild(p);}
  d.innerHTML="<b>"+(o.table?((PACK&&PACK.tableLabel&&PACK.tableLabel[cur]?PACK.tableLabel[cur]:"Table")+" "+o.table+" · "):"")+esc(o.person)+"</b>";
  const txt=document.createElement("span");txt.className="txt";txt.textContent=o.request;
  d.appendChild(txt);d.appendChild(stat);
  if(canUpdate&&!o.paid){const pb=document.createElement("button");pb.className="btn small";pb.textContent=t("markPaid");pb.style.background="#16a34a";pb.onclick=async()=>{await api("/api/live/order",{orderId:o.id,status:"paid"});haptic();renderOrders();};d.appendChild(pb);}
  if(canUpdate&&o.status!=="delivered"){
    const next=o.status==="sent"?"prep":o.status==="prep"?"ready":"delivered";
    const b=document.createElement("button");b.className="btn small";b.textContent=t(next)+" →";
    b.onclick=async()=>{await api("/api/live/order",{orderId:o.id,status:next});haptic();renderOrders();};
    d.appendChild(b);
  }
  return d;
}
async function renderOrders(){
  for(const id of ["ownerOrders","leadOrders","workerOrders"]){const el=$(id);if(el)el.innerHTML=skel(2);}
  const live=await api("/api/live");
  for(const id of ["ownerOrders","leadOrders","workerOrders"]){
    const el=$(id);if(!el)continue;
    el.innerHTML="";
    (live.orders||[]).forEach(o=>el.appendChild(orderRow(o,id!=="workerOrders")));
    if(!(live.orders||[]).length)el.innerHTML=empty("📦",t("noOrders"));
    if(id==="ownerOrders"){const os=live.orders||[];const paid=os.filter(o=>o.paid).length;$("billSummary").textContent=t("billSummary").replace("X",paid).replace("Y",os.length);}
  }
}
$("sayBtn").onclick=async()=>{const v=$("sayText").value.trim();if(!v)return;const r=await api("/api/live/transcript",{worker:me?me.name:"worker",text:v});if(r&&r.error){toast(String(r.error).indexOf("budget")>=0?t("budgetReached"):r.error);return;}$("sayText").value="";showMsg(t("processing"));};
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SR){$("micBtn").onclick=()=>{
  if(rec){rec.stop();return;}
  rec=new SR();rec.lang=(cur==="zh"?"zh-CN":cur==="ja"?"ja-JP":cur==="ko"?"ko-KR":cur==="ar"?"ar-SA":cur+"-"+(cur==="en"?"US":cur==="pt"?"PT":cur.toUpperCase()));
  rec.continuous=false;rec.interimResults=false;recording=true;$("micBtn").textContent="⏹";
  rec.onresult=async(e)=>{let txt="";for(let i=0;i<e.results.length;i++)txt+=e.results[i][0].transcript;await api("/api/live/transcript",{worker:me?me.name:"worker",text:txt});showMsg(t("processing"));};
  rec.onend=()=>{recording=false;$("micBtn").textContent=t("dictate");rec=null;};
  rec.start();
};}else{$("micBtn").disabled=true;$("micBtn").textContent=t("micUnsupported");}
function packFieldsHTML(){if(!PACK||!PACK.fields||!PACK.fields.length)return "";return PACK.fields.map(f=>'<input class="packField" data-fid="'+f.id+'" placeholder="'+(f.label&&f.label[cur]?f.label[cur]:f.id)+'">').join("");}
async function workerFlow(){
  const live=await api("/api/live");
  const wv=$("employeeView");
  if(!me){return;}
  $("wHome").classList.add("hidden");$("wListen").classList.add("hidden");$("wSummary").classList.add("hidden");
  if(live.status==="listening"){$("wListen").classList.remove("hidden");$("listeningBtn").textContent="🎙️ "+ (live.worker||"");$("packFields").innerHTML=packFieldsHTML();$("tableInput").value=live.table||"";}
  else if(live.status==="summary"){$("wSummary").classList.remove("hidden");$("summaryTitle").textContent=t("summaryTitle")+(live.table?(" — "+(PACK&&PACK.tableLabel&&PACK.tableLabel[cur]?PACK.tableLabel[cur]:"Table")+" "+live.table):"")+Object.entries(live.fields||{}).filter(([k,v])=>v).map(([k,v])=>" · "+v).join("");renderSummary(live);}
  else{$("wHome").classList.remove("hidden");}
  renderOrders();
}
function renderSummary(live){
  const body=$("summaryBody");body.innerHTML="";
  if(!(live.speakers||[]).length){body.innerHTML='<div class="card"><p class="note">'+t("noSummary")+'</p></div>';return;}
  for(const p of live.speakers){
    const d=document.createElement("div");d.className="person";
    const done=p.requests.filter(r=>r.status==="confirmed").length;
    let h='<div class="pname">'+t("person")+" "+(p.id.replace("p",""))+" — "+esc(p.name)+'<span class="pcnt">('+done+'/'+p.requests.length+')</span></div>';
    for(const r of p.requests){
      const confirmed=r.status==="confirmed";
      h+='<div class="req"><span class="txt">'+esc(r.text)+'</span>'+
        '<span class="tier tier-'+r.tier+'">'+t("tier"+r.tier)+'</span>'+
        '<button class="confirmBtn'+(confirmed?" done":"")+'" data-req="'+r.id+'">'+(confirmed?t("confirmed"):t("confirm"))+'</button></div>'+
        (confirmed?'<div class="sentline">✓ '+t("sentNote")+'</div>':'');
    }
    d.innerHTML=h;
    d.querySelectorAll(".confirmBtn").forEach(b=>b.onclick=async()=>{
      if(b.classList.contains("done"))return;
      b.textContent=t("confirmed");b.classList.add("done","checkpop");haptic();toast(t("confirmed"));
      await api("/api/live/confirm",{requestId:b.dataset.req});
      workerFlow();
    });
    body.appendChild(d);
  }
}
$("startBtn").onclick=async()=>{const fields={};document.querySelectorAll(".packField").forEach(i=>{fields[i.dataset.fid]=i.value.trim();});await api("/api/live/start",{worker:me.name,table:$("tableInput").value.trim()||null,fields});workerFlow();};
$("stopBtn").onclick=async()=>{const live=await api("/api/live");if((live.speakers||[]).length){live.status="summary";await api("/api/live/summary",{speakers:live.speakers});}else{await api("/api/live/close",{});}workerFlow();};
$("newConvBtn").onclick=async()=>{await api("/api/live/close",{});workerFlow();};
$("toHomeBtn").onclick=async()=>{await api("/api/live/close",{});workerFlow();};
async function enter(){
  if(!PACK){PACK=await api("/api/sector");applyPack();}
  setWho();
  if(me.role==="owner"){show("ownerView");try{if(!localStorage.getItem("lv-welcome"))$("welcomeCard").style.display="block";}catch(e){}loadRegister();loadMetrics($("ownerMetrics"));loadUsers();loadField();loadRules();loadUsage();renderOrders();loadPresets();}
  else if(me.role==="lead"){show("leadView");loadMetrics($("leadMetrics"));loadLead();renderOrders();if(kitchenPoll)clearInterval(kitchenPoll);kitchenPoll=setInterval(kitchenWatch,4000);}
  else{show("employeeView");$("workerHi").textContent=t("hi")+(me.label||me.name);loadRegister();workerFlow();if(livePoll)clearInterval(livePoll);livePoll=setInterval(()=>{if(me&&me.role==="employee")workerFlow();},3000);}
}
let pwVisible=false;
$("eyeBtn").onclick=()=>{pwVisible=!pwVisible;$("loginPass").type=pwVisible?"text":"password";$("eyeOn").classList.toggle("hidden",pwVisible);$("eyeOff").classList.toggle("hidden",!pwVisible);};
$("setupBtn").onclick=async()=>{
  const user=$("setupUser").value.trim();
  const password=$("setupPass").value;
  if(!user||password.length<8){toast(t("fillBoth"));return;}
  $("setupBtn").disabled=true;$("setupBtn").innerHTML='<span class="spin"></span>'+t("loggingIn");
  const r=await api("/api/setup",{user,password,sector:$("setupSector").value});
  if(r.error){$("setupBtn").disabled=false;$("setupBtn").textContent=t("setupBtn");toast(String(r.error).indexOf("already")>=0?t("loginFailed"):r.error);return;}
  token=r.token;me={name:r.name,role:r.role,label:r.label||r.name};
  sessionStorage.setItem("dsh-sup-token",token);sessionStorage.setItem("dsh-sup-me",JSON.stringify(me));
  enter();
};
$("loginBtn").onclick=async()=>{
  const err=$("loginError");
  err.classList.add("hidden");
  const u=$("loginUser").value.trim(),p=$("loginPass").value;
  if(!u||!p){err.textContent=t("fillBoth");err.classList.remove("hidden");return;}
  $("loginBtn").disabled=true;$("loginBtn").innerHTML='<span class="spin"></span>'+t("loggingIn");
  const r=await api("/api/login",{user:u,password:p});
  $("loginBtn").disabled=false;$("loginBtn").textContent=t("loginBtn");
  if(r.error){err.textContent=r.error==="network"?t("cannotReach"):t("loginFailed");err.classList.remove("hidden");err.classList.remove("shake");void err.offsetWidth;err.classList.add("shake");return;}
  err.classList.add("hidden");
  token=r.token;me={name:r.name,role:r.role,label:r.label||r.name};
  sessionStorage.setItem("dsh-sup-token",token);sessionStorage.setItem("dsh-sup-me",JSON.stringify(me));
  $("loginPass").value="";enter();
};
function logout(){api("/api/logout",{});token=null;me=null;sessionStorage.clear();if(livePoll)clearInterval(livePoll);if(kitchenPoll)clearInterval(kitchenPoll);setWho();show("loginView");}
$("logoutBtn").onclick=logout;
const sb=$("switchBtn");if(sb)sb.onclick=logout;
async function loadUsers(){const tb=$("usersTable").querySelector("tbody");tb.innerHTML='<tr><td colspan="2">'+skel(2)+'</td></tr>';const r=await api("/api/users");tb.innerHTML="";(r.users||[]).forEach(u=>{const tr=document.createElement("tr");tr.innerHTML="<td>"+esc(u.name)+"</td><td>"+esc(u.label||u.name)+" · "+t(LVL[u.role]||"lvlEmployee")+"</td>";tb.appendChild(tr);});}
$("addUserBtn").onclick=async()=>{const r=await api("/api/users",{name:$("newUser").value,password:$("newPass").value,role:$("newRole").value,label:$("newLabel").value});showMsg(r.error?"Error: "+r.error:t("workerAdded"));if(!r.error){loadUsers();$("newUser").value=$("newPass").value="";}};
async function loadField(){$("reports").innerHTML=skel(2);$("feedback").innerHTML=skel(1);$("trail").innerHTML=skel(1);const rc=(await api("/api/reports")).content;if(rc){$("reports").innerHTML="<pre>"+esc(rc)+"</pre>";}else{$("reports").innerHTML=empty("📋",t("noReports"));}const fc=(await api("/api/feedback")).content;if(fc){$("feedback").innerHTML="<pre>"+esc(fc)+"</pre>";}else{$("feedback").innerHTML=empty("💬",t("feedbackQueue"));}const live=await api("/api/live");const ib=(live.inbox||[]).map(x=>"[•] "+esc(x.worker)+": "+esc(x.text)).join("\n");if(ib){$("trail").innerHTML="<pre>"+ib+"</pre>";}else{$("trail").innerHTML=empty("🗒️",t("conversationTrail"));}}
async function loadLead(){$("leadReports").textContent=(await api("/api/reports")).content||"(empty)";$("leadFeedback").textContent=(await api("/api/feedback")).content||"(empty)";}
$("refreshReports").onclick=loadField;$("leadRefresh").onclick=loadLead;
const ar=$("autoRefresh");
if(ar)ar.onclick=()=>{auto=!auto;ar.textContent=auto?t("autoOn"):t("autoOff");if(auto){const iv=setInterval(()=>{if(!auto){clearInterval(iv);return;}if(me&&me.role==="owner"){loadField();renderOrders();}},30000);}};
async function loadPresets(){
  const r=await api("/api/sector-presets");
  const g=$("presetGrid");if(!g)return;g.innerHTML="";
  (r.presets||[]).forEach(p=>{const b=document.createElement("button");b.className="btn small gray";b.textContent=p.id;b.onclick=async()=>{await api("/api/sector",p);PACK=p;applyPack();showMsg(t("sectorSaved"));renderSuggest();};g.appendChild(b);});
  renderSuggest();
}
function renderSuggest(){const el=$("suggestUsers");if(!el||!PACK||!PACK.suggestedUsers)return;el.innerHTML="";(PACK.suggestedUsers||[]).forEach(su=>{const b=document.createElement("button");b.className="btn small gray";b.textContent="+ "+(su.label&&(su.label[cur]||su.label.en)||su.level);b.onclick=()=>{$("newUser").value="";$("newLabel").value=su.label&&(su.label[cur]||su.label.en)||"";$("newRole").value=su.level;};el.appendChild(b);});}
$("saveSectorBtn").onclick=async()=>{
  const pack={id:$("csId").value.trim()||"custom",
    tableLabel:{en:$("csLabelEn").value.trim()||"Table",fr:$("csLabelFr").value.trim(),es:$("csLabelEn").value.trim()||"Table"},
    ordersTarget:{en:$("csOrdersEn").value.trim()||"Orders",fr:$("csOrdersFr").value.trim()},
    entity:{en:"person",fr:"personne"},
    fields:[]};
  if($("csF1Id").value.trim())pack.fields.push({id:$("csF1Id").value.trim(),type:"text",label:{en:$("csF1Label").value.trim()||$("csF1Id").value.trim()}});
  if($("csF2Id").value.trim())pack.fields.push({id:$("csF2Id").value.trim(),type:"text",label:{en:$("csF2Label").value.trim()||$("csF2Id").value.trim()}});
  const r=await api("/api/sector",pack);showMsg(r.error?"Error":t("sectorSaved"));PACK=pack;applyPack();
};
$("aiSectorBtn").onclick=async()=>{
  const prompt="Live mirror mode (workflow-master). Design a sector pack JSON for this business, in this exact shape: {\"id\":\"<sector-id>\",\"tableLabel\":{\"en\":\"<entity label>\",\"es\":\"…\",\"fr\":\"…\"},\"ordersTarget\":{\"en\":\"<orders title>\",\"fr\":\"…\"},\"entity\":{\"en\":\"<entity>\",\"fr\":\"…\"},\"fields\":[{\"id\":\"<field>\",\"type\":\"number|text\",\"label\":{\"en\":\"<label>\",\"fr\":\"…\"}}]}. Describe your business here: "+($("csLabelEn").value||"(your business)")+". Reply ONLY with the JSON.";
  try{await navigator.clipboard.writeText(prompt);}catch(e){}
  showMsg(t("aiSectorCopied"));
};
async function loadRules(){$("decisions").value=(await api("/api/decisions")).content||"";}
$("saveDecisions").onclick=async()=>{await api("/api/decisions",{content:$("decisions").value});$("decisionsSaved").textContent=t("saved");setTimeout(()=>$("decisionsSaved").textContent="",2000);};
document.querySelectorAll(".tabs button, .bnav button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tabs button, .bnav button").forEach(x=>x.classList.remove("active"));b.classList.add("active");["overview","field","rules","sector"].forEach(x=>$("tab-"+x).classList.add("hidden"));$("tab-"+b.dataset.tab).classList.remove("hidden");});
$("reportBtn").onclick=async()=>{const r=await api("/api/report",{text:$("reportText").value});if(r.error){showMsg("Error: "+r.error);return;}$("reportText").value="";showMsg(t("reportSent"));};
$("empFbBtn").onclick=async()=>{const r=await api("/api/feedback",{worker:me.name,role:me.role,category:$("empFbCat").value,text:$("empFbText").value});if(r.error){showMsg("Error: "+r.error);return;}$("empFbText").value="";showMsg(t("feedbackSent"));};
api("/api/setup-status").then((st)=>{if(st&&st.users===0){$("setupSection").classList.remove("hidden");$("loginUser").parentNode.style.display="none";$("loginBtn").style.display="none";$("loginPass").closest(".passwrap").style.display="none";$("loginTitle").textContent=t("setupTitle");}}).catch(()=>{});
const st=sessionStorage.getItem("dsh-sup-token");
if(st){token=st;me=JSON.parse(sessionStorage.getItem("dsh-sup-me")||"null");(async()=>{const r=await api("/api/me");if(!r||!r.name){logout();return;}enter();})();}
else setWho();
async function wallTick(){try{const r=await (await fetch("/api/wall")).json();const cards=[[t("week"),r.reportsWeek],[t("ordersTitle"),r.orders],[t("feedback"),r.feedback],[t("workersActive"),r.workers],[t("reportsTotal"),r.reports]];$("wallCards").innerHTML=cards.map(c=>'<div class="wall-card"><div class="v">'+(c[1]===undefined?"–":c[1])+'</div><div class="l">'+c[0]+'</div></div>').join("");const ticks=[...(r.ordersTail||[]).map(x=>"🔔 "+esc(x)),...(r.feedbackTail||"").split("\n").filter(Boolean).slice(-4).map(esc)];$("wallFeed").innerHTML=ticks.length?ticks.map(x=>'<div class="wtick">'+x+'</div>').join(""):'<div class="wtick dim">'+t("noActivity")+'</div>';try{const s=await (await fetch("/api/sector")).json();$("wallSector").textContent=(s&&s.id)?s.id:"";}catch(e){}}catch(e){$("wallFeed").innerHTML='<div class="wtick dim">'+t("cannotReach")+'</div>';}}
function clockTick(){const d=new Date();$("wallClock").textContent=d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});$("wallDate").textContent=d.toLocaleDateString([],{weekday:"short",day:"numeric",month:"short"});}
if(location.search.indexOf("wall=1")>=0){
  document.body.classList.add("wall");show("wallView");
  clockTick();setInterval(clockTick,1000);
  wallTick();setInterval(wallTick,30000);
}
