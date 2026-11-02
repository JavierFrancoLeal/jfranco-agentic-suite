# Recommended stack — what to run and what to recommend

The goal: one tested, standardized configuration per business size, so the
first deployments run smoothly and support stays cheap. Everything below is
what we actually test against.

## The golden rule

**Standardize the stack; vary only the sector pack.** Every error we have
lived came from unstandardized pieces (laptops that sleep, guest WiFi,
browsers without dictation). A recommended stack removes those classes of
errors.

## Scenario 1 — Small business (restaurant, café, shop, counter)

| Layer | Recommendation | Why |
|---|---|---|
| 🧠 Brain | **Mac mini (M4, 16 GB)** or a mini PC with **Ubuntu 24.04 LTS**, wired Ethernet, always on | No sleep issues (laptops caused our demo outage); low power; silent |
| 🤖 Software | DeepSeek Harness + Supervisor `--lan --https`; Node ≥ 24 | What we ship and test |
| 📶 Connection | Brain on **Ethernet**; devices on the business WiFi; owner remote via **HTTPS + domain** (Let's Encrypt) | Wired brain removes WiFi hops; TLS fixes Safari/mixed-content |
| 📱 Workers | **Android tablets 10–11"** (Samsung Galaxy Tab A9+ / Lenovo Tab P11), **Chrome**, panel added to Home screen | Best dictation support, cheap, durable; Chrome is the most reliable for speech and PWA |
| 👑 Owner | Any laptop/phone, **Chrome or Edge** (Safari works; Firefox without dictation) | Dashboard + wallboard |
| 🍳 Kitchen/back office | One wall tablet (same model) with the lead view | Consistency |

## Scenario 2 — 100+ employees (manufacturing, chains)

| Layer | Recommendation |
|---|---|
| 🧠 Brain | **Dedicated server** (or cloud VM): 4–8 vCPU, 16–32 GB, Ubuntu 24.04, `--db --https` |
| 💾 Data | Supervisor SQLite (today) → PostgreSQL (roadmap), nightly backups |
| 🔐 Identity | Supervisor users + SSO via Active Directory/Entra (roadmap) |
| 📱 Stations | Rugged Android tablets (Samsung XCover / Zebra) on industrial WiFi/VLAN, Chrome kiosk |
| 👑 Owner | Dashboard anywhere over HTTPS + domain |

## Browsers (hard rule)

| Browser | Verdict |
|---|---|
| **Chrome / Edge** | ✅ Recommended — dictation, PWA, clipboard, everything |
| Safari | ✅ Works (dictation needs a user gesture; HTTPS recommended) |
| Firefox | ⚠️ Typing only (no SpeechRecognition) — acceptable for owner views |
| Samsung Internet | ✅ Good on Android |

## Operating systems of the brain

| OS | Verdict |
|---|---|
| macOS (mini/studio) | ✅ Best first choice: everything we tested |
| Ubuntu 24.04 LTS | ✅ Best for scale/cost (npm dsh) |
| Windows 11 | ✅ Works (desktop app + PowerShell) |
| Android | ❌ Not a brain — client only |

## Why standardize (the business case)

1. **Fewer support cases** — one tested path instead of infinite
   combinations.
2. **Faster onboarding** — "buy this list" instead of "make it work".
3. **The scale path is built in** — the same software runs from a Mac mini
   to a server; hardware is the only change.
4. **Your promise to clients:** "Follow this list and the system runs like
   the demo."

## The sales one-pager line

**"A Mac mini as the brain, Android tablets with Chrome for the team, and
the dashboard everywhere — that's the whole bill of materials."**
