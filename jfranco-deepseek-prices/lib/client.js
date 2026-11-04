window.__ModuleLoader__.load({
	id: "@javierfrancoleal/deepseek-prices",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");

		// ── styles ────────────────────────────────────────────────────────────────
		const CSS = [
			".Jfdp_bar{box-sizing:border-box;width:100%;height:34px;display:flex;align-items:center;gap:14px;padding:0 16px;border-top:1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.2));background:var(--dsw-specific-menu, rgba(0,0,0,.04));color:var(--dsw-alias-label-secondary, #666);font-size:12px;line-height:1;font-family:var(--dsh-font-family-body, inherit);overflow:hidden;white-space:nowrap}",
			".Jfdp_bar[data-tariff='peak']{background:linear-gradient(90deg, rgba(229,72,77,.10), var(--dsw-specific-menu, rgba(0,0,0,.04))) }",
			".Jfdp_bar[data-tariff='offpeak']{background:linear-gradient(90deg, rgba(48,164,108,.10), var(--dsw-specific-menu, rgba(0,0,0,.04))) }",
			".Jfdp_dot{width:9px;height:9px;border-radius:50%;flex:none;background:#e5484d;box-shadow:0 0 0 3px rgba(229,72,77,.15)}",
			".Jfdp_bar[data-tariff='offpeak'] .Jfdp_dot{background:#30a46c;box-shadow:0 0 0 3px rgba(48,164,108,.15)}",
			".Jfdp_status{flex:none;font-weight:700;font-size:12px;letter-spacing:.06em;color:var(--dsw-alias-label-primary, #111)}",
			".Jfdp_bar[data-tariff='peak'] .Jfdp_status{color:#e5484d}",
			".Jfdp_bar[data-tariff='offpeak'] .Jfdp_status{color:#30a46c}",
			".Jfdp_model{display:inline-flex;align-items:baseline;gap:6px;flex:none}",
			".Jfdp_modelName{font-weight:600;color:var(--dsw-alias-label-primary, #111)}",
			".Jfdp_price{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary, #555)}",
			".Jfdp_arrow{opacity:.55}",
			".Jfdp_spacer{flex:1}",
			".Jfdp_clock{flex:none;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary, #888)}",
			".Jfdp_countdown{flex:none;font-weight:600;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary, #111)}",
			".Jfdp_countdown b{color:var(--dsw-alias-label-secondary, #555);font-weight:600}",
			".Jfdp_hideSmall{flex:none}",
			"@media (max-width:900px){.Jfdp_bar{gap:8px;padding:0 10px}.Jfdp_hideSmall{display:none}}"
		].join("\n");
		const cssTagId = "@javierfrancoleal/deepseek-prices/PriceBar.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@javierfrancoleal/deepseek-prices";
			tag.dataset.pluginCss = cssTagId;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		// ── canonical pricing snapshot (verified 2026-11-03) ─────────────────────
		const PRICING = {
			verifiedAt: "2026-11-03",
			source: "https://api-docs.deepseek.com/quick_start/pricing",
			peakWindowsUtc: [
				{ start: "01:00", end: "04:00" },
				{ start: "06:00", end: "10:00" }
			],
			chineseHolidays2026: [
				"2026-01-01",
				"2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-21", "2026-02-22",
				"2026-04-04", "2026-04-05", "2026-04-06",
				"2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05",
				"2026-06-19", "2026-06-20", "2026-06-21",
				"2026-09-25", "2026-09-26", "2026-09-27",
				"2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"
			],
			models: {
				"deepseek-flash": {
					label: "Flash",
					inputCacheHit: { peak: 0.006, offPeak: 0.003 },
					inputCacheMiss: { peak: 0.3, offPeak: 0.15 },
					output: { peak: 1.2, offPeak: 0.6 }
				},
				"deepseek-v4-pro": {
					label: "Pro",
					inputCacheHit: { peak: 0.044, offPeak: 0.022 },
					inputCacheMiss: { peak: 1.32, offPeak: 0.66 },
					output: { peak: 3.96, offPeak: 1.98 }
				}
			}
		};

		const WINDOWS = PRICING.peakWindowsUtc.map(function (w) {
			const a = w.start.split(":").map(Number);
			const b = w.end.split(":").map(Number);
			return [a[0] * 60 + a[1], b[0] * 60 + b[1]];
		});
		const HOLIDAYS = new Set(PRICING.chineseHolidays2026 || []);

		function isoDate(date) {
			const y = date.getUTCFullYear();
			const m = String(date.getUTCMonth() + 1).padStart(2, "0");
			const d = String(date.getUTCDate()).padStart(2, "0");
			return y + "-" + m + "-" + d;
		}
		function isPeak(date) {
			const day = date.getUTCDay();
			if (day === 0 || day === 6) return false;
			if (HOLIDAYS.has(isoDate(date))) return false;
			const mins = date.getUTCHours() * 60 + date.getUTCMinutes();
			for (let i = 0; i < WINDOWS.length; i++) {
				if (mins >= WINDOWS[i][0] && mins < WINDOWS[i][1]) return true;
			}
			return false;
		}
		function nextTransition(date) {
			const cur = isPeak(date);
			let t = new Date(date.getTime());
			for (let i = 0; i < 60 * 24 * 10; i++) {
				t = new Date(t.getTime() + 60000);
				if (isPeak(t) !== cur) return t;
			}
			return null;
		}
		function fmtClock(date, tz) {
			try {
				return new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
			} catch (e) {
				return "--:--";
			}
		}
		function fmtDuration(ms) {
			let s = Math.max(0, Math.floor(ms / 1000));
			const h = Math.floor(s / 3600);
			const m = Math.floor((s % 3600) / 60);
			const sec = s % 60;
			if (h > 0) return h + "h " + m + "m " + sec + "s";
			if (m > 0) return m + "m " + sec + "s";
			return sec + "s";
		}
		function fmtPrice(n) {
			if (n < 0.01) return "$" + n.toFixed(3);
			return "$" + n.toFixed(2);
		}

		const LANGS = {
			en: { peak: "PEAK", offPeak: "OFF-PEAK", to: "to", utc: "UTC", quebec: "Quebec", changes: "changes to", in: "in", next: "next" },
			fr: { peak: "POINTE", offPeak: "HORS POINTE", to: "à", utc: "UTC", quebec: "Québec", changes: "passe à", in: "dans", next: "prochaine" },
			es: { peak: "PICO", offPeak: "VALLE", to: "a", utc: "UTC", quebec: "Québec", changes: "cambia a", in: "en", next: "próximo" }
		};
		function pickLang() {
			try {
				const l = (navigator.language || "").toLowerCase();
				if (l.indexOf("fr") === 0) return "fr";
				if (l.indexOf("en") === 0) return "en";
			} catch (e) { /* ignore */ }
			return "es";
		}

		function PriceBar() {
			const [now, setNow] = React.useState(function () { return new Date(); });
			React.useEffect(function () {
				const id = setInterval(function () { setNow(new Date()); }, 1000);
				return function () { clearInterval(id); };
			}, []);

			const peak = isPeak(now);
			const next = nextTransition(now);
			const lang = pickLang();
			const t = LANGS[lang] || LANGS.es;
			const tariff = peak ? "peak" : "offpeak";
			const statusLabel = peak ? t.peak : t.offPeak;
			const nextLabel = next ? (isPeak(next) ? t.peak : t.offPeak) : "";
			const remaining = next ? fmtDuration(next.getTime() - now.getTime()) : "—";

			const modelRows = Object.keys(PRICING.models).map(function (key) {
				const m = PRICING.models[key];
				const inp = m.inputCacheMiss[peak ? "peak" : "offPeak"];
				const out = m.output[peak ? "peak" : "offPeak"];
				return React.createElement("span", { className: "Jfdp_model", key: key },
					React.createElement("span", { className: "Jfdp_modelName" }, m.label),
					React.createElement("span", { className: "Jfdp_price" },
						fmtPrice(inp),
						React.createElement("span", { className: "Jfdp_arrow" }, " → "),
						fmtPrice(out)
					)
				);
			});

			// Full-detail tooltip (cache hit + cache miss + output, peak & off-peak).
			const detail = Object.keys(PRICING.models).map(function (key) {
				const m = PRICING.models[key];
				return m.label + " — " + t.peak + ": in " + fmtPrice(m.inputCacheMiss.peak)
					+ " (hit " + fmtPrice(m.inputCacheHit.peak) + ") / out " + fmtPrice(m.output.peak)
					+ "  ·  " + t.offPeak + ": in " + fmtPrice(m.inputCacheMiss.offPeak)
					+ " (hit " + fmtPrice(m.inputCacheHit.offPeak) + ") / out " + fmtPrice(m.output.offPeak);
			}).join("\n");
			const title = "DeepSeek token prices (USD / 1M)\n" + detail
				+ "\n\n" + t.peak + ": 01:00–04:00 & 06:00–10:00 UTC (Mon–Fri, excl. CN holidays)"
				+ "\n" + t.offPeak + ": all other hours (50% off)"
				+ "\nSource: " + PRICING.source + "\nVerified: " + PRICING.verifiedAt;

			return React.createElement("div", {
				className: "Jfdp_bar",
				"data-tariff": tariff,
				"data-deepseek-prices": "true",
				title: title
			},
				React.createElement("span", { className: "Jfdp_dot" }),
				React.createElement("span", { className: "Jfdp_status" }, statusLabel),
				React.createElement("span", { className: "Jfdp_hideSmall" }, "·"),
				modelRows,
				React.createElement("span", { className: "Jfdp_spacer" }),
				React.createElement("span", { className: "Jfdp_clock" }, t.utc + " " + fmtClock(now, "UTC")),
				React.createElement("span", { className: "Jfdp_clock Jfdp_hideSmall" }, t.quebec + " " + fmtClock(now, "America/Toronto")),
				React.createElement("span", { className: "Jfdp_countdown" },
					next ? (t.changes + " " + nextLabel + " " + t.in + " " + remaining + " · " + fmtClock(next, "America/Toronto") + " " + t.quebec) : ""
				)
			);
		}

		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("shell.bottom", function () {
				return ctx.slots.register({
					name: "shell.bottom",
					id: "jfranco-deepseek-prices",
					order: 0
				}, PriceBar);
			});
		}

		exports.PriceBar = PriceBar;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
