# LOCAL-BRAINS — the pedagogical exercise (free models, real hardware, Québec costs)

*Which FREE open models approach deepseek-flash and deepseek-v4-pro,
what hardware runs them with DSH + Fanal, and what it costs in Québec.
2026-11-06. Prices in CAD, approximate, taxes extra.*

## The honest baseline

No free local model equals deepseek-v4-pro on frontier reasoning today.
The top open models reach ~85-95% of its quality for FANAL's tasks
(drafting, replies, structured JSON, summaries) — the deep philosophical
questions stay with the cloud brain. That is the honest trade.

## The two tiers, matched

| Fanal tier | The cloud brain | The free local candidates |
|---|---|---|
| fast (flash) | deepseek-flash | Qwen3-8B/14B · Llama 3.3 8B · Gemma 3 12B · Phi-4 14B — drafting, JSON, summaries: excellent |
| deep (v4-pro) | deepseek-v4-pro | Qwen3-32B (thinking) · DeepSeek-R1-Distill 32B/70B · Llama 4 Scout · Gemma 3 27B — reasoning for business decisions: very good |

## The hardware that runs them (with DSH + Fanal)

| Machine | RAM/VRAM | Runs | Verdict |
|---|---|---|---|
| 🍎 Mac mini M4 (16 GB) | 16 GB unified | flash tier (8-14B Q4) fully local | the sovereignty entry |
| 🍎 Mac mini M4 Pro (48 GB) | 48 GB unified | BOTH tiers (32B-70B Q4) | the sweet spot |
| 🍎 Mac Studio M4 Max (64-128 GB) | 64-128 GB | 70B-123B comfortable | the flagship |
| 🍎 MacBook Pro M4 Pro (48 GB) | 48 GB | both tiers, portable | for the owner who travels |
| 🪟 PC RTX 4090 (24 GB) | 24 GB VRAM | 32B Q4; 70B split | the Windows equivalent |
| 🪟 PC RTX 5090 (32 GB) | 32 GB VRAM | 32B-70B Q4 | the Windows flagship |
| 🪟 Used RTX 3090 (24 GB) | 24 GB VRAM | 32B Q4 | the budget Windows path |

## The costs in Québec (CAD, approximate)

| Option | Hardware | Running cost | The trade |
|---|---|---|---|
| Mac mini M4 16 GB | ~$799 | ~$6-10/year electricity (idle ~8-10 W, Québec ~7,3 ¢/kWh) | flash tier local, one-time, zero per-token |
| Mac mini M4 Pro 48 GB | ~$2 199 | ~$10-15/year | BOTH tiers local — the recommended sovereignty kit |
| Mac Studio M4 Max 64 GB | ~$3 299 | ~$15-20/year | the flagship for heavy multi-client use |
| Windows RTX 4090 PC | ~$3 500-4 500 | ~$50-90/year (450 W under load) | Windows shops |
| Windows used RTX 3090 | ~$1 200-1 600 | ~$50/year | budget Windows path |

## The pedagogical conclusion

- The CLOUD brain needs ZERO hardware: pay per token (fractions of a
  cent per Fanal action) — the default for every client.
- The LOCAL brain is the SOVEREIGNTY tier: a Mac mini M4 ($799) covers
  the fast tier forever; a Mac mini M4 Pro ($2 199) covers both tiers
  with zero data leaving the building and zero per-token cost.
- Fanal already routes both (the ⚙️ Réglages router + the wizard
  choice): the client picks cloud today, local tomorrow — same product.
