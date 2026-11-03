#!/bin/sh
# API journey smoke — boots the supervisor in a TEMP data dir and exercises
# the whole user journey end to end. A regression in any endpoint fails this.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="${NODE:-/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node}"
PORT="${LV_TEST_PORT:-8897}"
DATA="$(mktemp -d /tmp/lv-api-smoke.XXXXXX)"
cleanup() { [ -f "$DATA/pid" ] && kill "$(cat "$DATA/pid")" 2>/dev/null; rm -rf "$DATA"; }
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

step "setup (create owner)"
TOK="$(curl -sf -X POST "$BASE/api/setup" -H "Content-Type: application/json" -d '{"user":"Owner","password":"password123","sector":"restaurant"}' | sed 's/.*"token":"\([a-f0-9]*\).*/\1/')"
[ -n "$TOK" ] || { echo "FAIL"; exit 1; }; echo "ok"

step "second setup rejected (one door)"
[ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/setup" -H "Content-Type: application/json" -d '{"user":"X","password":"password123"}')" = "409" ] || { echo "FAIL"; exit 1; }; echo "ok"

step "login"
TOK="$(curl -sf -X POST "$BASE/api/login" -H "Content-Type: application/json" -d '{"user":"Owner","password":"password123"}' | sed 's/.*"token":"\([a-f0-9]*\).*/\1/')"
[ -n "$TOK" ] || { echo "FAIL"; exit 1; }; echo "ok"

AUTH="Authorization: Bearer $TOK"
step "register open + add + charge + close (variance)"
curl -sf -X POST "$BASE/api/register/open" -H "$AUTH" -H "Content-Type: application/json" -d '{"worker":"Ana"}' >/dev/null
curl -sf -X POST "$BASE/api/register/add" -H "$AUTH" -H "Content-Type: application/json" -d '{"name":"Café","price":3.5}' >/dev/null
curl -sf -X POST "$BASE/api/register/add" -H "$AUTH" -H "Content-Type: application/json" -d '{"name":"Croissant","price":4.2}' >/dev/null
curl -sf -X POST "$BASE/api/register/charge" -H "$AUTH" -H "Content-Type: application/json" -d '{"method":"terminal"}' | grep -q '"total":7.7' || { echo "FAIL"; exit 1; }
VAR="$(curl -sf -X POST "$BASE/api/register/close" -H "$AUTH" -H "Content-Type: application/json" -d '{"declared":6.7}' | sed 's/.*"variance":\([0-9.-]*\).*/\1/')"
[ "$VAR" = "-1" ] || { echo "FAIL (variance=$VAR)"; exit 1; }; echo "ok ($VAR detected)"

step "Z-report export"
curl -sf -o /dev/null "$BASE/api/export?type=register" -H "$AUTH" || { echo "FAIL"; exit 1; }; echo "ok"

step "orders + paid flag"
curl -sf -X POST "$BASE/api/live/summary" -H "$AUTH" -H "Content-Type: application/json" -d '{"speakers":[{"name":"Mesa 3","requests":[{"text":"dos cafés","tier":"GREEN"}]}]}' >/dev/null
curl -sf -X POST "$BASE/api/live/confirm" -H "$AUTH" -H "Content-Type: application/json" -d '{"requestId":"p1-r1"}' >/dev/null
curl -sf -X POST "$BASE/api/live/order" -H "$AUTH" -H "Content-Type: application/json" -d '{"orderId":"o1","status":"paid"}' >/dev/null
curl -sf "$BASE/api/live" -H "$AUTH" | grep -q '"paid":true' || { echo "FAIL"; exit 1; }; echo "ok"

echo "API SMOKE PASSED: journey completa"
