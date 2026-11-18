#!/bin/sh
# API journey smoke — boots the supervisor in a TEMP data dir and exercises
# the whole user journey end to end. A regression in any endpoint fails this.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="${NODE:-/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node}"
PORT="${LV_TEST_PORT:-8897}"
DATA="$(mktemp -d /tmp/lv-api-smoke.XXXXXX)"
cleanup() {
  [ -f "$DATA/pid" ] && kill "$(cat "$DATA/pid")" 2>/dev/null || true
  [ -f "$DATA/studio_pid" ] && kill "$(cat "$DATA/studio_pid")" 2>/dev/null || true
  rm -rf "$DATA"
}
trap cleanup EXIT

DSH_SUPERVISOR_DATA="$DATA" DSH_SUPERVISOR_PORT="$PORT" "$NODE" "$ROOT/supervisor/server.js" >/dev/null 2>&1 &
echo $! > "$DATA/pid"
sleep 1.2
BASE="http://127.0.0.1:$PORT"

step() { printf "  %s… " "$1"; }

step "health"
curl -sf "$BASE/api/health" | grep -q '"ok":true' || { echo "FAIL"; exit 1; }; echo "ok"

step "setup-status (first run)"
[ "$(curl -sf "$BASE/api/setup-status" | sed 's/.*"users":\([0-9]*\).*/\1/')" = "0" ] || { echo "FAIL"; exit 1; }; echo "ok"

step "strict setup gate & username pre-check"
[ "$(curl -sf "$BASE/api/setup/check-username?name=admin" | grep -c '"ERR_USER_RESERVED"')" = "1" ] || { echo "FAIL reserved username allowed"; exit 1; }
[ "$(curl -sf "$BASE/api/setup/check-username?name=Owner" | grep -c '"available":true')" = "1" ] || { echo "FAIL valid username check"; exit 1; }
WEAK_SETUP_CODE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/setup" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"user":"Owner","password":"password123"}')"
[ "$WEAK_SETUP_CODE" = "400" ] || { echo "FAIL weak/incomplete setup returned $WEAK_SETUP_CODE instead of 400"; exit 1; }
echo "ok"

step "setup (create owner + sealed Constitution V2 + HttpOnly dsh_sup cookie + CSRF check)"
SETUP_JSON="$(curl -sf -D "$DATA/setup-hdrs.txt" -c "$DATA/cookies.txt" -X POST "$BASE/api/setup" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"user":"Owner","password":"VaultGuard!2026","passwordConfirm":"VaultGuard!2026","scaleType":"AUTONOMOUS_SOLO","professionKey":"CPA_COMPTABLE","constitution":{"bizName":"Cabinet Smoke CPA","taxRegime":"PETIT_FOURNISSEUR_EXEMPT","rprpName":"Owner Smoke","rprpEmail":"rprp@cabinet-smoke.example","toneRegister":"VOUVOIEMENT_CHALEUREUX","pricingFloorCad":250,"discountPolicy":"LOCKED_0_PCT","escalationRules":["RED_PROMISE_DEADLINE","RED_LEGAL_MEDICAL_OPINION"],"signerInitials":"OS"}}')"
TOK="$(printf '%s' "$SETUP_JSON" | sed 's/.*"token":"\([a-f0-9]*\).*/\1/')"
[ -n "$TOK" ] || { echo "FAIL"; exit 1; }
printf '%s' "$SETUP_JSON" | grep -q '"FANAL-CONSTITUTION-V2"' || { echo "FAIL missing FANAL-CONSTITUTION-V2 schema"; exit 1; }
printf '%s' "$SETUP_JSON" | grep -q '"genesisHash":"' || { echo "FAIL missing genesisHash"; exit 1; }
grep -qi 'Set-Cookie:.*dsh_sup=.*HttpOnly.*SameSite=Strict' "$DATA/setup-hdrs.txt" || { echo "FAIL missing HttpOnly SameSite=Strict cookie"; exit 1; }
CSRF_CODE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/sector" -b "$DATA/cookies.txt" -H "Content-Type: application/json" -d '{"sector":"restaurant"}')"
[ "$CSRF_CODE" = "403" ] || { echo "FAIL CSRF bypass allowed ($CSRF_CODE)"; exit 1; }
CHECK_POST_CODE="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/setup/check-username?name=AnotherUser")"
[ "$CHECK_POST_CODE" = "401" ] || { echo "FAIL unauthenticated /api/setup/check-username post-setup returned $CHECK_POST_CODE"; exit 1; }
echo "ok"

step "second setup rejected (one door)"
[ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/setup" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"user":"X","password":"VaultGuard!2026"}')" = "409" ] || { echo "FAIL"; exit 1; }; echo "ok"

step "login + credential/integrity verification + user uniqueness/password hardening"
LOGIN_JSON="$(curl -sf -X POST "$BASE/api/login" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"user":"Owner","password":"VaultGuard!2026"}')"
TOK="$(printf '%s' "$LOGIN_JSON" | sed 's/.*"token":"\([a-f0-9]*\).*/\1/')"
[ -n "$TOK" ] || { echo "FAIL"; exit 1; }
printf '%s' "$LOGIN_JSON" | grep -q '"verified":true' || { echo "FAIL login missing verification.verified=true"; exit 1; }
AUTH="Authorization: Bearer $TOK"
DUP_USER_CODE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/users" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"name":"owner","password":"StaffStrong!2026","role":"employee"}')"
[ "$DUP_USER_CODE" = "409" ] || { echo "FAIL duplicate case-insensitive username returned $DUP_USER_CODE instead of 409"; exit 1; }
WEAK_USER_PW_CODE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/users" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"name":"staffA","password":"weak","role":"employee"}')"
[ "$WEAK_USER_PW_CODE" = "400" ] || { echo "FAIL weak user password returned $WEAK_USER_PW_CODE instead of 400"; exit 1; }
curl -sf -X POST "$BASE/api/users" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"name":"StaffA","password":"StaffStrong!2026","role":"employee"}' >/dev/null || { echo "FAIL creating valid staff user"; exit 1; }
DUP_STAFF_CODE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/users" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"name":"staffa","password":"StaffStrong!2026","role":"employee"}')"
[ "$DUP_STAFF_CODE" = "409" ] || { echo "FAIL duplicate case-insensitive staff username returned $DUP_STAFF_CODE instead of 409"; exit 1; }
ATTEST_RAW="$(curl -sf "$BASE/api/installation/attestation" -H "$AUTH")"
ATTEST_BUNDLE="$("$NODE" -e 'const d=JSON.parse(process.argv[1]);if(!d.attestation||d.attestation.schemaVersion!=="FANAL-INSTALL-ATTEST-V1")process.exit(1);process.stdout.write(JSON.stringify(d.attestation))' "$ATTEST_RAW")" || { echo "FAIL attestation schema"; exit 1; }
if printf '%s' "$ATTEST_BUNDLE" | grep -qiE 'rprp@cabinet-smoke.example|Owner Smoke|Cabinet Smoke'; then
  echo "FAIL attestation leaked raw PII"; exit 1
fi
echo "ok"
step "register open + add + charge + close (variance)"
curl -sf -X POST "$BASE/api/register/open" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"worker":"Ana"}' >/dev/null
curl -sf -X POST "$BASE/api/register/add" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"name":"Café","price":3.5}' >/dev/null
curl -sf -X POST "$BASE/api/register/add" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"name":"Croissant","price":4.2}' >/dev/null
curl -sf -X POST "$BASE/api/register/charge" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"method":"terminal"}' | grep -q '"total":7.7' || { echo "FAIL"; exit 1; }
VAR="$(curl -sf -X POST "$BASE/api/register/close" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"declared":6.7}' | sed 's/.*"variance":\([0-9.-]*\).*/\1/')"
[ "$VAR" = "-1" ] || { echo "FAIL (variance=$VAR)"; exit 1; }; echo "ok ($VAR detected)"

step "Z-report export"
curl -sf -o /dev/null "$BASE/api/export?type=register" -H "$AUTH" || { echo "FAIL"; exit 1; }; echo "ok"

step "sanitized support ticket + diagnostic export (no vault/PII leak)"
printf '{"sentinel":true}' > "$DATA/vault-last.json"
BEFORE_V="$(cat "$DATA/vault-last.json")"
curl -sf -X POST "$BASE/api/support/ticket" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" \
  -d '{"userProblemDescription":"Bonjour M. Tremblay, email jean@example.com failed with Bearer sk-secret123456789 at /Users/alice/doc.pdf","failingDocumentRawText":"C:\\Users\\alice\\tax.pdf"}' | grep -q '"ok":true' || { echo "FAIL ticket"; exit 1; }
AFTER_V="$(cat "$DATA/vault-last.json")"
[ "$BEFORE_V" = "$AFTER_V" ] || { echo "FAIL vault-last.json clobbered"; exit 1; }
DIAG_JSON="$(curl -sf "$BASE/api/diagnostic/export" -H "$AUTH")"
echo "$DIAG_JSON" | grep -q '"loi25Redacted":true' || { echo "FAIL diag export"; exit 1; }
for leak in "sk-secret123456789" "jean@example.com" "/Users/alice" "Users\\\\alice" '"vault":'; do
  if echo "$DIAG_JSON" | grep -qF "$leak"; then echo "FAIL leak found: $leak"; exit 1; fi
done
curl -sf "$BASE/api/diagnostic/export?format=md" -H "$AUTH" | grep -q "Sanitized Diagnostic Export" || { echo "FAIL diag md"; exit 1; }
echo "ok"

step "closed curated brain modes + dual BYOK masking"
curl -sf "$BASE/api/settings/brain" -H "$AUTH" | grep -q '"closedCatalog":true' || { echo "FAIL closedCatalog missing"; exit 1; }
if curl -sf "$BASE/api/settings/brain" -H "$AUTH" | grep -q "gemini-3.1-pro"; then echo "FAIL stale gemini-3.1-pro"; exit 1; fi
BAD_BRAIN_CODE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/settings/brain" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"fast":{"baseUrl":"https://evil.example/v1","model":"gpt-4o"}}')"
[ "$BAD_BRAIN_CODE" = "400" ] || { echo "FAIL open override accepted (code=$BAD_BRAIN_CODE)"; exit 1; }
curl -sf -X POST "$BASE/api/settings/brain" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" \
  -d '{"mode":"dual_cloud","deepseekKey":"sk-smoke-ds-key-9876","geminiKey":"AIzaSySmokeGemKey5432109876"}' | grep -q '"ok":true' || { echo "FAIL save dual BYOK"; exit 1; }
BRAIN_GET="$(curl -sf "$BASE/api/settings/brain" -H "$AUTH")"
echo "$BRAIN_GET" | grep -q '"configured":true' || { echo "FAIL brain configured"; exit 1; }
for leak in "sk-smoke-ds-key-9876" "AIzaSySmokeGemKey5432109876"; do
  if echo "$BRAIN_GET" | grep -qF "$leak"; then echo "FAIL brain endpoint leaked key: $leak"; exit 1; fi
done
DIAG_AFTER_KEY="$(curl -sf "$BASE/api/diagnostic/export" -H "$AUTH")"
for leak in "sk-smoke-ds-key-9876" "AIzaSySmokeGemKey5432109876"; do
  if echo "$DIAG_AFTER_KEY" | grep -qF "$leak"; then echo "FAIL diag leaked BYOK key: $leak"; exit 1; fi
done
BAD_LOCAL_CODE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/settings/brain" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"mode":"local_sovereign","localModel":"qwen2.5:7b"}')"
[ "$BAD_LOCAL_CODE" = "400" ] || { echo "FAIL local_sovereign override accepted (code=$BAD_LOCAL_CODE)"; exit 1; }
echo "ok"

step "orders + paid flag"
curl -sf -X POST "$BASE/api/live/summary" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"speakers":[{"name":"Mesa 3","requests":[{"text":"dos cafés","tier":"GREEN"}]}]}' >/dev/null
curl -sf -X POST "$BASE/api/live/confirm" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"requestId":"p1-r1"}' >/dev/null
curl -sf -X POST "$BASE/api/live/order" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"orderId":"o1","status":"paid"}' >/dev/null
curl -sf "$BASE/api/live" -H "$AUTH" | grep -q '"paid":true' || { echo "FAIL"; exit 1; }; echo "ok"

step "unauthenticated route hardening (401 on live/state/sector/translate/feedback/usage)"
for ep in "/api/live" "/api/state" "/api/sector"; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "$BASE$ep")"
  [ "$CODE" = "401" ] || { echo "FAIL GET $ep returned $CODE instead of 401"; exit 1; }
done
for ep in "/api/translate" "/api/feedback" "/api/usage" "/api/live/start"; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE$ep" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{}')"
  [ "$CODE" = "401" ] || { echo "FAIL POST $ep returned $CODE instead of 401"; exit 1; }
done
TRIAGE_UNAUTH="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/triage" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{}')"
[ "$TRIAGE_UNAUTH" = "403" ] || [ "$TRIAGE_UNAUTH" = "401" ] || { echo "FAIL unauth POST /api/triage returned $TRIAGE_UNAUTH"; exit 1; }
curl -sf -b "$DATA/cookies.txt" "$BASE/api/state" >/dev/null || { echo "FAIL cookie auth on /api/state"; exit 1; }
echo "ok"

step "Quebec solo profiles & deterministic triage (CRIC <15d & RBQ)"
PRESETS="$(curl -sf "$BASE/api/sector-presets")"
echo "$PRESETS" | grep -q '"CRIC_IMMIGRATION"' || { echo "FAIL sector-presets missing CRIC_IMMIGRATION"; exit 1; }
echo "$PRESETS" | grep -q '"ARTISAN_RBQ"' || { echo "FAIL sector-presets missing ARTISAN_RBQ"; exit 1; }
curl -sf -X POST "$BASE/api/profile" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" \
  -d '{"scaleType":"AUTONOMOUS_SOLO","professionKey":"CRIC_IMMIGRATION"}' | grep -q '"professionKey":"CRIC_IMMIGRATION"' || { echo "FAIL profile CRIC_IMMIGRATION"; exit 1; }
CRIC_TRIAGE="$(curl -sf -X POST "$BASE/api/triage" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" \
  -d '{"profession":"CRIC_IMMIGRATION","payload":{"items":[{"id":"ircc-1","daysToDeadline":10,"mathVerified":true}]}}')"
echo "$CRIC_TRIAGE" | grep -q 'DÉLAI IRCC CRITIQUE' || { echo "FAIL CRIC <15d blocker missing: $CRIC_TRIAGE"; exit 1; }
RBQ_TRIAGE="$(curl -sf -X POST "$BASE/api/triage" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" \
  -d '{"profession":"ARTISAN_RBQ","payload":{"rbqLicenseNumber":"INVALID-99","items":[]}}')"
echo "$RBQ_TRIAGE" | grep -q 'LICENCE RBQ INVALIDE' || { echo "FAIL RBQ license check missing: $RBQ_TRIAGE"; exit 1; }
echo "ok"

step "wallboard auth gate + PURE_FIXED_BUFFET_MONTHLY billing (zero 40-dossier cap)"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/wall")" = "401" ] || { echo "FAIL /api/wall unauthenticated did not return 401"; exit 1; }
curl -sf "$BASE/api/wall" -H "$AUTH" | grep -q '"workers":' || { echo "FAIL /api/wall with auth"; exit 1; }
INV_OUT="$(curl -sf -X POST "$BASE/api/invoice" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"profile":{"id":"solo-1","name":"Cabinet Test","tier":"SOLO","isFirstMonth":false},"rows":[{"type":"DOSSIER_SIGNED","deltaPct":5,"apiCostCad":0.07},{"type":"DOSSIER_SIGNED","deltaPct":10,"apiCostCad":0.07}]}')"
echo "$INV_OUT" | grep -q '"PURE_FIXED_BUFFET_MONTHLY"' || { echo "FAIL invoice missing PURE_FIXED_BUFFET_MONTHLY"; exit 1; }
if echo "$INV_OUT" | grep -qi "40 dossiers"; then echo "FAIL invoice still mentions 40 dossiers cap"; exit 1; fi
echo "$INV_OUT" | grep -q '"retainerFee":350' || { echo "FAIL invoice retainerFee"; exit 1; }
echo "$INV_OUT" | grep -q '"dossiersNet":0' || { echo "FAIL invoice zero per-dossier fee"; exit 1; }
echo "$INV_OUT" | grep -q '"totalTtcCad":402.41' || { echo "FAIL invoice TPS+TVQ TTC"; exit 1; }
echo "ok"

step "studio telemetry route isolation (403 on client, live p50/p90 on studio)"
CLIENT_TEL_CODE="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/studio/telemetry" -H "$AUTH")"
[ "$CLIENT_TEL_CODE" = "403" ] || { echo "FAIL client allowed /api/studio/telemetry ($CLIENT_TEL_CODE)"; exit 1; }
STUDIO_PORT=$((PORT + 1))
STUDIO_DATA="$DATA/studio"
mkdir -p "$STUDIO_DATA"
FANAL_EDITION="studio" DSH_SUPERVISOR_DATA="$STUDIO_DATA" DSH_SUPERVISOR_PORT="$STUDIO_PORT" "$NODE" "$ROOT/supervisor/server.js" >/dev/null 2>&1 &
STUDIO_PID=$!
echo "$STUDIO_PID" > "$DATA/studio_pid"
sleep 1.2
STOK="$(curl -sf -X POST "http://127.0.0.1:$STUDIO_PORT/api/setup" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"user":"Creator","password":"StudioStrong!2026","passwordConfirm":"StudioStrong!2026","scaleType":"SME_CELL","sector":"solo","constitution":{"bizName":"Studio Fanal","taxRegime":"INSCRIT_TPS_TVQ","tpsNumber":"123456789RT0001","tvqNumber":"1234567890TQ0001","rprpName":"Javier Franco","rprpEmail":"studio@fanal.example","toneRegister":"FORMEL_FIDUCIAIRE","pricingFloorCad":490,"discountPolicy":"LOCKED_0_PCT","escalationRules":["RED_PROMISE_DEADLINE","RED_EXTERNAL_COMMITMENT"],"signerInitials":"JF"}}' | sed 's/.*"token":"\([a-f0-9]*\).*/\1/')"
curl -sf -X POST "http://127.0.0.1:$STUDIO_PORT/api/triage" -H "Authorization: Bearer $STOK" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" \
  -d '{"profession":"CPA_COMPTABLE","payload":{"items":[]}}' >/dev/null
STEL="$(curl -sf "http://127.0.0.1:$STUDIO_PORT/api/studio/telemetry" -H "Authorization: Bearer $STOK")"
VERIF_OUT="$(curl -sf -X POST "http://127.0.0.1:$STUDIO_PORT/api/studio/verify-installation" -H "Authorization: Bearer $STOK" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d "{\"clientAlias\":\"Cabinet Smoke Pilote\",\"attestation\":$ATTEST_BUNDLE}")"
printf '%s' "$VERIF_OUT" | grep -q '"signatureValid":true' || { echo "FAIL studio attestation signature verify: $VERIF_OUT"; exit 1; }
printf '%s' "$VERIF_OUT" | grep -q '"overallStatus":"VERIFIED"' || { echo "FAIL studio attestation overallStatus: $VERIF_OUT"; exit 1; }
TAMPERED_CODE="$("$NODE" -e 'const a=JSON.parse(process.argv[1]);a.installationProfile.professionKey="RESTAURANT_FAKE";process.stdout.write(JSON.stringify({attestation:a}))' "$ATTEST_BUNDLE" | curl -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:$STUDIO_PORT/api/studio/verify-installation" -H "Authorization: Bearer $STOK" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d @-)"
[ "$TAMPERED_CODE" = "400" ] || { echo "FAIL tampered attestation accepted ($TAMPERED_CODE)"; exit 1; }
ATT_ID="$("$NODE" -e 'const d=JSON.parse(process.argv[1]);process.stdout.write(String(d.verification&&d.verification.attestationId||""))' "$VERIF_OUT")"
[ -n "$ATT_ID" ] || { echo "FAIL missing attestationId"; exit 1; }
curl -sf -X POST "http://127.0.0.1:$STUDIO_PORT/api/studio/verified-installations/approve" -H "Authorization: Bearer $STOK" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" \
  -d "{\"attestationId\":\"$ATT_ID\",\"status\":\"APPROVED\",\"note\":\"Validé SOP\"}" | grep -q '"APPROVED"' || { echo "FAIL studio human approval"; exit 1; }
kill "$STUDIO_PID" 2>/dev/null || true
wait "$STUDIO_PID" 2>/dev/null || true
echo "$STEL" | grep -q '"cohortSummary"' || { echo "FAIL studio telemetry missing cohortSummary"; exit 1; }
echo "$STEL" | grep -q '"byTaskType"' || { echo "FAIL studio telemetry missing byTaskType"; exit 1; }
echo "$STEL" | grep -q '"buffetPoolMetrics"' || { echo "FAIL studio telemetry missing buffetPoolMetrics"; exit 1; }
echo "$STEL" | grep -q 'deterministic_triage' || { echo "FAIL studio telemetry did not record triage call"; exit 1; }
echo "ok"

step "suspended experimental CDP pilot + passive Z-report + sector Affluence + counter A2DP + webcam"
BR_CODE="$(curl -s -o "$DATA/br.out" -w '%{http_code}' -X POST "$BASE/api/browser/start" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"url":"https://example.com"}')"
[ "$BR_CODE" = "403" ] || { echo "FAIL /api/browser/start expected 403 suspended, got $BR_CODE"; exit 1; }
grep -q 'experimental_pilot_suspended' "$DATA/br.out" || { echo "FAIL /api/browser/start missing experimental_pilot_suspended"; exit 1; }
Z_OUT="$(curl -sf -X POST "$BASE/api/register/import-z" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"filename":"mev-z.csv","content":"date,total_sales,cash,card,tps,tvq,transactions,declared\n2026-11-15,1250.00,250.00,1000.00,62.50,124.69,42,1250.00"}')"
echo "$Z_OUT" | grep -q '"totalSalesCad":1250' || { echo "FAIL /api/register/import-z totalSalesCad: $Z_OUT"; exit 1; }
curl -sf -X POST "$BASE/api/profile" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"scaleType":"MICRO_SINGLE_OWNER","sector":"restaurant"}' | grep -q '"showAffluenceCard":true' || { echo "FAIL profile restaurant showAffluenceCard"; exit 1; }
curl -sf -X POST "$BASE/api/affluence/config" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"enabled":true,"regionName":"Charlevoix Test","lat":47.44,"lon":-70.50}' | grep -q 'Charlevoix Test' || { echo "FAIL /api/affluence/config"; exit 1; }
AFF_OUT="$(curl -sf "$BASE/api/affluence?skipNetwork=1" -H "$AUTH")"
echo "$AFF_OUT" | grep -q '"FANAL-AFFLUENCE-V1"' || { echo "FAIL /api/affluence schemaVersion: $AFF_OUT"; exit 1; }
curl -sf "$BASE/api/counter-interpreter/status" -H "$AUTH" | grep -q '"dailyMinutesCap"' || { echo "FAIL /api/counter-interpreter/status"; exit 1; }
curl -sf -X POST "$BASE/api/counter-interpreter/config" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"dailyMinutesCap":45}' | grep -q '"dailyMinutesCap":45' || { echo "FAIL /api/counter-interpreter/config"; exit 1; }
WB_OUT="$(curl -sf -X POST "$BASE/api/intake/webcam" -H "$AUTH" -H "Content-Type: application/json" -H "X-Fanal-CSRF: 1" -d '{"mimeType":"image/jpeg","imageBase64":"dGhpcyBpcyBhIGZha2UgYmFzZTY0IGpwZWcgcGF5bG9hZCBmb3Igc21va2UgdGVzdGluZw==","label":"Ticket comptoir test"}')"
echo "$WB_OUT" | grep -q '"taskId":"t' || { echo "FAIL /api/intake/webcam taskId: $WB_OUT"; exit 1; }
echo "ok"

echo "API SMOKE PASSED: journey completa"
