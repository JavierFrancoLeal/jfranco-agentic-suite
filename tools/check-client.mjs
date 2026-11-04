// Mock-carga un bundle cliente de DSH (lib/client.js) y verifica sus exports.
// Uso: node check-client.mjs <client.js>
// Sin dependencias: simula window/__ModuleLoader__, document, navigator y react.

const path = process.argv[2];
if (!path) { console.error("usage: node check-client.mjs <client.js>"); process.exit(2); }

import { readFileSync } from "node:fs";

const failures = [];
const makeEl = (type) => ({ type, appendChild() {}, dataset: {}, set textContent(v) { this._t = v; }, get textContent() { return this._t; } });

let registration = null;
globalThis.window = { __ModuleLoader__: { load(reg) { registration = reg; } } };
globalThis.document = { createElement: makeEl, querySelector: () => null, head: { appendChild() {} } };
// Node >=21 ya define un `navigator` global (solo lectura); no lo sobrescribimos.

const ReactMock = {
  createElement(type, props, ...children) { return { type, props: props || {}, children }; },
  useState(v) { return [typeof v === "function" ? v() : v, () => {}]; },
  useEffect() {},
  memo(x) { return x; },
};

const code = readFileSync(path, "utf8");
try { (0, eval)(code); }
catch (e) { console.error("FAIL: eval del bundle lanzó:", e.message); process.exit(1); }

if (!registration) { console.error("FAIL: window.__ModuleLoader__.load nunca fue llamado"); process.exit(1); }
console.log("registrado id:", registration.id);

const requireFn = (spec) => {
  if (spec === "react" || spec === "react/jsx-runtime") return ReactMock;
  return {}; // stub para módulos baseline
};

let exports;
try { exports = registration.factory(requireFn); }
catch (e) { console.error("FAIL: factory lanzó:", e.message); process.exit(1); }

if (typeof exports.apply !== "function") failures.push("exports.apply no es función");
if (!Array.isArray(exports.inject)) failures.push("exports.inject no es array");
console.log("inject:", JSON.stringify(exports.inject || null));

if (typeof exports.apply === "function") {
  let injected = null, localeReg = null;
  const ctx = {
    effect() { return () => {}; },
    locale: { register(ns, dicts) { localeReg = { ns, dicts }; return () => {}; } },
    slots: {
      inject(name, fac) { injected = { name }; try { injected.reg = fac(); } catch (e) { injected.err = e.message; } },
      register(opts, Comp) { return { opts, Comp, dispose() { return 1; } }; },
    },
  };
  try { exports.apply(ctx); } catch (e) { failures.push("apply lanzó: " + e.message); }

  if (injected) {
    console.log("slot inyectado:", injected.name, injected.err ? "(error: " + injected.err + ")" : "");
    if (injected.err) failures.push("slot factory lanzó: " + injected.err);
  }
  if (localeReg) {
    const { en, zh } = localeReg.dicts || {};
    if (en && zh) {
      const ek = Object.keys(en).sort(), zk = Object.keys(zh).sort();
      const same = JSON.stringify(ek) === JSON.stringify(zk);
      if (!same) failures.push("las claves en/zh no coinciden");
      console.log("locale ns:", localeReg.ns, "| idiomas:", Object.keys(localeReg.dicts).join(","), "| en==zh:", same);
    } else {
      console.log("locale ns:", localeReg.ns, "(sin diccionarios en/zh)");
    }
  }
  if (injected && injected.reg && typeof injected.reg.Comp === "function") {
    const dict = (localeReg && localeReg.dicts.en) || {};
    const t = (k) => dict[k] || k;
    try { const v = injected.reg.Comp({ t }); console.log("render OK, raíz:", v && v.type); }
    catch (e) { failures.push("render del componente lanzó: " + e.message); }
  }
}

if (failures.length) { console.error("FAIL:\n- " + failures.join("\n- ")); process.exit(1); }
console.log("PASS");
