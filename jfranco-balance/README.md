# @javierfrancoleal/balance

**Live DeepSeek account balance in the bottom bar** — dual-face plugin for
DeepSeek Harness (DSH ≥ 0.2.1-rc.0). The host half queries
`GET https://api.deepseek.com/user/balance` and streams the result to the
browser through the **Remote/Typert** pattern; the client half renders a
centered pill over the prices bar (`@javierfrancoleal/deepseek-prices`),
showing the **topped-up balance** and the **total available credit**, live.

## What it shows

- 🟢 **Balance** — topped-up and total available, per currency (USD/CNY).
- Availability dot: green when `is_available`, amber when the balance is too
  low for API calls, red on refresh errors, gray when no credential exists.
- Tooltip with granted balance, availability, auth method, and last-updated time.
- Updates in live: the host refreshes the API every 60 s (TTL 45 s); the pill
  polls the host snapshot every 30 s.

## How it works (dual-face)

```
lib/index.js    host half:  BalanceService extends TypertRemoteService
                            (Cordis service key "balance") → gateway SRC
                            discovery exposes the endpoint
                            "balance/getSnapshot" (hand-written Remote marker,
                            no generated ./typert artifact, no build step).
lib/balance-api.js           fetch + normalize GET /user/balance.
lib/client.js   browser half: ctx.remote.$mount(contribution) →
                            ctx.remote.balance.getSnapshot(); pill on the
                            shell.overlay slot, centered over .Jfdp_bar.
```

### Credentials (host-only, resolved per refresh, never stored)

1. **API key** — `ctx.get("credentials").resolve("DEEPSEEK_API_KEY")`
   → `Authorization: Bearer <key>`.
2. **Account token (fallback)** — `ctx.get("deepseekAccount")
   .resolveToken("https://api.deepseek.com")` → `x-dsh-auth-token`
   (live-verified 2026-11-04; works when the user is signed in with their
   DeepSeek account, even without an API key).

No credential → the pill shows a neutral "no credential" state with a hint.

### Why not `shell.bottom`?

`shell.bottom` is a **single** slot already occupied by
`@javierfrancoleal/deepseek-prices` (a second static registration at the same
priority throws). The balance pill therefore mounts on **`shell.overlay`** (a
root *list* slot — the additive seat for status pills), positioned
`left:50%; bottom:0` and sized to the real `.Jfdp_bar` band, so it renders
integrated and centered relative to the prices bar without touching that
package.

## Install (desktop profile, local `link:`)

1. In `~/.dsh/profiles/desktop/package.json`:
   - `dependencies`: `"@javierfrancoleal/balance": "link:/abs/path/plugins/jfranco-balance"`
   - `dsh.profile.bundles`: add `"@javierfrancoleal/balance"`.
2. `cd ~/.dsh/profiles/desktop && pnpm install`
3. **Restart the DeepSeek Harness app** (new bundles are not picked up by HMR).

## Validate

```bash
node tools/check-plugin.sh balance --compose   # syntax + mock-load + compose
# after restarting the app (revisioned combo route):
curl -sS "http://127.0.0.1:<port>/plugins/??@javierfrancoleal/balance/client.js&rev=<rev>"  # 200
```

Creado por **J.Franco**.
