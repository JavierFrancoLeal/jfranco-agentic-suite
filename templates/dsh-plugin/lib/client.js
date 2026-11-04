window.__ModuleLoader__.load({
	id: "@javierfrancoleal/__NAME__",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");

		const NS = "__NAME__";
		const zh = { "hello": "你好" };
		const en = { "hello": "Hello" };

		function Bar(_props) {
			const t = _props && typeof _props.t === "function" ? _props.t : function (k) { return k; };
			return React.createElement("div", {
				style: {
					boxSizing: "border-box",
					padding: "8px 16px",
					borderTop: "1px solid var(--dsw-alias-border-l1)",
					background: "var(--dsw-specific-menu)",
					color: "var(--dsw-alias-label-primary)",
					fontSize: "12px"
				}
			}, t("hello"));
		}

		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.effect(function () {
				return ctx.locale.register(NS, { zh, en });
			}, "__NAME__: locale dictionaries");
			ctx.slots.inject("shell.bottom", function () {
				return ctx.slots.register({
					name: "shell.bottom",
					id: "__NAME__",
					order: 0,
					locale: NS
				}, Bar);
			});
		}

		exports.Bar = Bar;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
