window.__ModuleLoader__.load({
	id: "@javierfrancoleal/balance",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");

		// ── i18n namespace (follows the DeepSeek Harness UI language: en/zh) ──
		const NS = "balance";
		const zh = {
			"label.balance": "余额",
			"label.toppedUp": "充值",
			"label.total": "总额",
			"status.loading": "余额加载中…",
			"status.noCredential": "未配置凭据",
			"status.error": "余额不可用",
			"tooltip.title": "DeepSeek 账户余额",
			"tooltip.topUp": "充值余额",
			"tooltip.total": "总可用余额",
			"tooltip.granted": "赠送余额",
			"tooltip.available": "余额充足，可调用 API",
			"tooltip.unavailable": "余额不足，无法调用 API",
			"tooltip.updated": "更新时间",
			"tooltip.auth.apiKey": "通过 API 密钥验证",
			"tooltip.auth.account": "通过 DeepSeek 账户验证",
			"tooltip.noCredential": "请在“设置 → 模型”保存 DEEPSEEK_API_KEY，或登录 DeepSeek 账户以查看实时余额。",
			"tooltip.error": "无法刷新余额。"
		};
		const en = {
			"label.balance": "Balance",
			"label.toppedUp": "Topped-up",
			"label.total": "Total",
			"status.loading": "Loading balance…",
			"status.noCredential": "No credential",
			"status.error": "Balance unavailable",
			"tooltip.title": "DeepSeek account balance",
			"tooltip.topUp": "Topped-up balance",
			"tooltip.total": "Total available balance",
			"tooltip.granted": "Granted balance (promotions)",
			"tooltip.available": "Sufficient balance for API calls",
			"tooltip.unavailable": "Insufficient balance for API calls",
			"tooltip.updated": "Updated",
			"tooltip.auth.apiKey": "Authenticated with API key",
			"tooltip.auth.account": "Authenticated with DeepSeek account",
			"tooltip.noCredential": "Store a DEEPSEEK_API_KEY (Settings → Models) or sign in with your DeepSeek account to see the live balance.",
			"tooltip.error": "The balance could not be refreshed."
		};

		// ── styles (theme tokens only; centered pill over the prices bar) ────
		const CSS = [
			".Jfb_seat{position:absolute;left:50%;bottom:0;transform:translateX(-50%);display:flex;align-items:center;pointer-events:auto;z-index:20}",
			".Jfb_pill{box-sizing:border-box;display:flex;align-items:center;gap:8px;height:26px;padding:0 12px;margin:4px 0;border-radius:var(--dsw-radius-md);background:var(--dsw-specific-menu);border:1px solid var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-panel);backdrop-filter:var(--dsw-menu-backdrop-filter);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1;white-space:nowrap}",
			".Jfb_dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-label-tertiary)}",
			".Jfb_pill[data-state='ok-available'] .Jfb_dot{background:var(--dsw-alias-state-success-primary)}",
			".Jfb_pill[data-state='ok-low'] .Jfb_dot{background:var(--dsw-alias-state-warn-primary)}",
			".Jfb_pill[data-state='error'] .Jfb_dot{background:var(--dsw-alias-state-error-primary)}",
			".Jfb_label{font-weight:700;letter-spacing:.05em;color:var(--dsw-alias-label-primary)}",
			".Jfb_value{font-variant-numeric:tabular-nums}",
			".Jfb_sep{opacity:.55}",
			"@media (max-width:900px){.Jfb_pill{gap:6px;padding:0 8px}.Jfb_hideSmall{display:none}}"
		].join("\n");
		const cssTagId = "@javierfrancoleal/balance/BalancePill.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@javierfrancoleal/balance";
			tag.dataset.pluginCss = cssTagId;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		// ── Remote contribution (hand-written; src-json result, no parameters.
		// Mirrors the descriptor shape the generated typert.remote-client.js
		// builds; $mount installs the ctx.remote.balance service.) ───────────
		const CONTRIBUTION = {
			package: "@javierfrancoleal/balance",
			descriptors: [{
				id: "@javierfrancoleal/balance#balance/getSnapshot",
				service: "balance",
				namespace: "balance",
				method: "getSnapshot",
				invocation: { kind: "direct" },
				parameters: [],
				result: { mode: "src-json" }
			}]
		};

		// Set by apply() once the namespace is mounted; the component reads
		// the handle through this accessor so the mock loader stays safe.
		let getBalanceHandle = null;

		function fmtMoney(value, currency) {
			if (value === null || value === undefined) return "—";
			const symbol = currency === "CNY" ? "¥" : "$";
			return symbol + value;
		}

		function BalancePill(_props) {
			const t = _props && typeof _props.t === "function" ? _props.t : function (k) { return k; };
			const [snap, setSnap] = React.useState(null);
			const [barHeight, setBarHeight] = React.useState(0);

			// Poll the host snapshot every 30 s (the host refreshes the API
			// itself, at most every 45 s of staleness).
			React.useEffect(function () {
				let disposed = false;
				const tick = async function () {
					const handle = getBalanceHandle ? getBalanceHandle() : null;
					if (handle === null) return;
					try {
						const res = await handle.getSnapshot();
						if (disposed) return;
						if (res && res.ok) setSnap(res.value);
						else setSnap({ state: "error", error: res && res.error ? (res.error.message || res.error.code || "remote") : "remote" });
					} catch (error) {
						if (!disposed) setSnap({ state: "error", error: error && error.message ? error.message : String(error) });
					}
				};
				tick();
				const id = setInterval(tick, 30000);
				return function () { disposed = true; clearInterval(id); };
			}, []);

			// The pill lives inside the prices bar's band: measure the real bar
			// (heartbeat, in case it appears after us or resizes) and hide when
			// it is absent.
			React.useEffect(function () {
				const measure = function () {
					const bar = document.querySelector('.Jfdp_bar[data-deepseek-prices="true"]');
					setBarHeight(bar ? bar.getBoundingClientRect().height : 0);
				};
				measure();
				const id = setInterval(measure, 2000);
				return function () { clearInterval(id); };
			}, []);

			if (barHeight <= 0) return null;

			const state = snap ? snap.state : "loading";
			const rows = snap && Array.isArray(snap.rows) ? snap.rows : [];
			const row = rows.find(function (r) { return r.currency === "USD"; }) || rows[0] || null;

			let pillState = "loading";
			let label = t("status.loading");
			let values = null;
			let tooltip = t("tooltip.title");
			if (state === "no-credential") {
				pillState = "nocred";
				label = t("status.noCredential");
				tooltip = t("tooltip.title") + "\n" + t("tooltip.noCredential");
			} else if (state === "error") {
				pillState = "error";
				label = t("status.error");
				tooltip = t("tooltip.title") + "\n" + t("tooltip.error") + "\n" + (snap.error || "");
			} else if (state === "ok" && row !== null) {
				pillState = snap.isAvailable ? "ok-available" : "ok-low";
				label = t("label.balance");
				values = row;
				const lines = rows.map(function (r) {
					return r.currency + " — " + t("tooltip.topUp") + " " + fmtMoney(r.toppedUpBalance, r.currency)
						+ " · " + t("tooltip.granted") + " " + fmtMoney(r.grantedBalance, r.currency)
						+ " · " + t("tooltip.total") + " " + fmtMoney(r.totalBalance, r.currency);
				}).join("\n");
				tooltip = t("tooltip.title") + "\n" + lines
					+ "\n" + (snap.isAvailable ? t("tooltip.available") : t("tooltip.unavailable"))
					+ (snap.authKind ? "\n" + t(snap.authKind === "api-key" ? "tooltip.auth.apiKey" : "tooltip.auth.account") : "")
					+ (snap.fetchedAt ? "\n" + t("tooltip.updated") + ": " + new Date(snap.fetchedAt).toLocaleTimeString() : "");
			}

			return React.createElement("div", { className: "Jfb_seat", style: { height: barHeight + "px" } },
				React.createElement("div", { className: "Jfb_pill", "data-state": pillState, title: tooltip },
					React.createElement("span", { className: "Jfb_dot" }),
					React.createElement("span", { className: "Jfb_label" }, label),
					values !== null ? React.createElement(React.Fragment, null,
						React.createElement("span", { className: "Jfb_sep Jfb_hideSmall" }, "·"),
						React.createElement("span", { className: "Jfb_hideSmall" }, t("label.toppedUp")),
						React.createElement("span", { className: "Jfb_value" }, fmtMoney(values.toppedUpBalance, values.currency)),
						React.createElement("span", { className: "Jfb_sep" }, "·"),
						React.createElement("span", { className: "Jfb_hideSmall" }, t("label.total")),
						React.createElement("span", { className: "Jfb_value" }, fmtMoney(values.totalBalance, values.currency))
					) : null
				)
			);
		}

		const inject = ["slots", "locale", "remote"];
		async function apply(ctx) {
			ctx.effect(function () {
				return ctx.locale.register(NS, { zh, en });
			}, "balance: locale dictionaries");
			// shell.overlay is a root LIST slot (additive): the pill rides on
			// top of the prices bar without touching shell.bottom (single).
			ctx.slots.inject("shell.overlay", function () {
				return ctx.slots.register({
					name: "shell.overlay",
					id: "balance-bottom-pill",
					order: 0,
					locale: NS
				}, BalancePill);
			});
			// Mount the remote namespace (host: endpoint balance/getSnapshot).
			if (!ctx.remote || typeof ctx.remote.$mount !== "function") return;
			try {
				await ctx.remote.$mount(CONTRIBUTION);
				getBalanceHandle = function () {
					try { return ctx.get("remote.balance"); } catch (error) { return null; }
				};
			} catch (error) {
				console.error("[balance] remote mount failed:", error);
			}
		}

		exports.BalancePill = BalancePill;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
