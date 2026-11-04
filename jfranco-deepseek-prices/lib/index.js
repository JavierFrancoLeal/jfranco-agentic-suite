// @javierfrancoleal/deepseek-prices — host half.
//
// Schedules a daily self-verification against the official DeepSeek pricing
// page and appends one JSONL record per run to
// `~/.dsh/deepseek-prices/verify.jsonl`. A drift (peak-hour windows or key
// token prices differing from the canonical snapshot below) is logged as a
// warning through the host logger.
//
// The browser half (lib/client.js) renders the live price bar; it ships its
// own copy of PRICING so the two halves stay independently loadable.
import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const name = "jfranco-deepseek-prices";

// Canonical pricing snapshot.
// Verified 2026-11-03 against https://api-docs.deepseek.com/quick_start/pricing
// (prices are USD per 1M tokens; off-peak is half of peak).
export const PRICING = {
  verifiedAt: "2026-11-03",
  source: "https://api-docs.deepseek.com/quick_start/pricing",
  // Peak hours are 01:00-04:00 and 06:00-10:00 UTC, Monday-Friday, excluding
  // Chinese public holidays. Everything else is off-peak (50% of peak).
  peakWindowsUtc: [
    { start: "01:00", end: "04:00" },
    { start: "06:00", end: "10:00" },
  ],
  peakDays: "Mon-Fri",
  peakNote: "excluding Chinese public holidays",
  // 2026 Chinese statutory holidays (approximate — review annually; the daily
  // verifier checks prices and peak windows, not this list).
  chineseHolidays2026: [
    "2026-01-01",
    "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-21", "2026-02-22",
    "2026-04-04", "2026-04-05", "2026-04-06",
    "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05",
    "2026-06-19", "2026-06-20", "2026-06-21",
    "2026-09-25", "2026-09-26", "2026-09-27",
    "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07",
  ],
  models: {
    "deepseek-flash": {
      inputCacheHit: { peak: 0.006, offPeak: 0.003 },
      inputCacheMiss: { peak: 0.3, offPeak: 0.15 },
      output: { peak: 1.2, offPeak: 0.6 },
    },
    "deepseek-v4-pro": {
      inputCacheHit: { peak: 0.044, offPeak: 0.022 },
      inputCacheMiss: { peak: 1.32, offPeak: 0.66 },
      output: { peak: 3.96, offPeak: 1.98 },
    },
  },
};

const VERIFY_LOG_DIR = join(homedir(), ".dsh", "deepseek-prices");

/** Strip HTML tags so a Docusaurus page can be scanned as plain text. */
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract the expected peak/off-peak signals from the fetched pricing text. */
function scanPage(text) {
  const findings = {};
  // Peak-hours sentence, e.g. "Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC, ..."
  const peakMatch = /Peak hours are\s+([^.]+)/i.exec(text);
  findings.peakHours = peakMatch ? peakMatch[1].trim() : null;
  findings.halfPrice = /Off-peak rates are half of the peak rates/i.test(text);

  // Key prices we expect to see anywhere on the page (USD per 1M tokens).
  const expectedPrices = [
    "0.003", "0.006", "0.15", "0.3", "0.6", "1.2",
    "0.022", "0.044", "0.66", "1.32", "1.98", "3.96",
  ];
  findings.missingPrices = expectedPrices.filter((p) => !text.includes(p));

  // Model names present.
  findings.models = {
    flash: text.includes("deepseek-flash"),
    pro: text.includes("deepseek-v4-pro"),
  };
  return findings;
}

/**
 * Fetch the official pricing page and compare it against PRICING.
 * Returns a plain record; never throws.
 */
export async function verify(_ctx) {
  const result = {
    checkedAt: new Date().toISOString(),
    source: PRICING.source,
    status: "ok",
    drift: null,
    findings: null,
    error: null,
  };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let res;
    try {
      res = await fetch(PRICING.source, {
        signal: controller.signal,
        headers: { "user-agent": "deepseek-prices-verifier/1.0" },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const findings = scanPage(stripHtml(text));
    result.findings = findings;

    const drift = [];
    const expectedHours = "01:00 - 04:00 and 06:00 - 10:00 UTC";
    if (findings.peakHours && !findings.peakHours.toLowerCase().includes("01:00")
        && !findings.peakHours.includes("06:00")) {
      drift.push(`peak-hours changed: ${findings.peakHours} (expected ${expectedHours})`);
    }
    if (findings.missingPrices.length > 0) {
      drift.push(`prices not found on page: ${findings.missingPrices.join(", ")}`);
    }
    if (!findings.halfPrice) {
      drift.push("off-peak-is-half rule not found on page");
    }
    if (drift.length > 0) {
      result.status = "drift";
      result.drift = drift;
    }
  } catch (error) {
    result.status = "error";
    result.error = error instanceof Error ? error.message : String(error);
  }

  // Append one JSONL record (best effort; a full disk must not crash the host).
  try {
    await mkdir(VERIFY_LOG_DIR, { recursive: true });
    await appendFile(join(VERIFY_LOG_DIR, "verify.jsonl"), JSON.stringify(result) + "\n", "utf8");
  } catch (_error) {
    /* ignore */
  }

  if (_ctx?.logger) {
    if (result.status === "error") {
      _ctx.logger.warn(`[deepseek-prices] verification failed: ${result.error}`);
    } else if (result.status === "drift") {
      _ctx.logger.warn(`[deepseek-prices] PRICE DRIFT: ${result.drift.join(" | ")}`);
    } else {
      _ctx.logger.info(`[deepseek-prices] verified against official page, no drift (${result.checkedAt})`);
    }
  }
  return result;
}

function apply(ctx) {
  ctx.effect(() => {
    let cancelled = false;
    let timer = null;
    const run = async () => {
      await verify(ctx);
      if (!cancelled) timer = setTimeout(run, 24 * 60 * 60 * 1000);
    };
    // First check shortly after the host settles, then once a day.
    timer = setTimeout(run, 30 * 1000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, "deepseek-prices: daily verification");
}

export { apply, name };
