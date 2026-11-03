// CSS class-collision guard for supervisor/dashboard.html.
// Family 1 of the antifragile review (NAMING): two components must never
// share a plain class selector — the later rule wins silently (the .tick
// bug that darkened the language reel). Fails CI on any duplicate.
const fs = require("fs");
const path = require("path");

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
  // plain class selectors exactly like .name{ or .name { — only when the class
  // is the WHOLE selector (combined selectors such as "body.dark .btn" don't count)
  for (const s of css.matchAll(/(^|[;}{])\s*\.([A-Za-z0-9_-]+)\s*(?=[{])/g)) {
    const name = s[2];
    if (!seen.has(name)) seen.set(name, 1);
    else seen.set(name, seen.get(name) + 1);
  }
}

const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([n]) => "." + n);
if (dupes.length) {
  console.log("CSS GUARD FAILED: duplicate plain class selectors: " + dupes.join(", "));
  process.exit(1);
}
console.log("CSS GUARD PASSED: no duplicate class selectors");
