// CSS class-collision guard for supervisor/dashboard.html.
// Family 1 of the antifragile review (NAMING): two DIFFERENT components must
// never share a plain class selector — the later rule wins silently (the .tick
// bug that darkened the language reel). Fails CI on any new duplicate.
const fs = require("fs");
const path = require("path");

// Known-good multi-rule classes: ONE component, several property groups.
// Any NEW duplicate must be added here consciously or the gate fails.
const WHITELIST = new Set([".bnav", ".person", ".tabs", ".listen"]);

const htmlPath = path.join(__dirname, "..", "supervisor", "dashboard.html");
const html = fs.readFileSync(htmlPath, "utf8");

const styleBlocks = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)];
if (!styleBlocks.length) {
  console.log("CSS GUARD: no <style> block found");
  process.exit(1);
}

const seen = new Map();
for (const m of styleBlocks) {
  const css = m[1];
  // capture complete selectors, then keep ONLY plain ".name" selectors
  for (const s of css.matchAll(/(^|[;}{])\s*([^{};]+)\{/g)) {
    const sel = s[2].trim();
    const exact = sel.match(/^\.([A-Za-z0-9_-]+)$/);
    if (!exact) continue;
    const name = "." + exact[1];
    if (WHITELIST.has(name)) continue;
    seen.set(name, (seen.get(name) || 0) + 1);
  }
}

const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([n]) => n);
if (dupes.length) {
  console.log("CSS GUARD FAILED: duplicate plain class selectors: " + dupes.join(", "));
  process.exit(1);
}
console.log("CSS GUARD PASSED: no unwhitelisted duplicate class selectors");
