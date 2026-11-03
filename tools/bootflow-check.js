// Boot-flow contract checker for the dashboard.
// The iatrogenic bugs (regressions) all broke CONTRACTS between CSS and JS.
// This guard asserts the six critical contracts so the medicine cannot be
// worse than the disease. Fails CI on any violation.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "supervisor");
const html = fs.readFileSync(path.join(ROOT, "dashboard.html"), "utf8");
const cssM = html.match(/<style>([\s\S]*?)<\/style>/);
const jsM = html.match(/<script>([\s\S]*?)<\/script>/);
if (!cssM || !jsM) { console.log("BOOTFLOW FAILED: missing style/script blocks"); process.exit(1); }
const css = cssM[1];
const js = jsM[1];
const fails = [];

// 1. .hidden must be a plain utility (JS reveals screens via style.display)
if (/\.hidden\{[^}]*!important/.test(css)) fails.push("1: .hidden uses !important");

// 2. #langOverlay must live OUTSIDE <main> (the firstboot lock hides main)
{
  const mIdx = html.indexOf("<main");
  const oIdx = html.indexOf('id="langOverlay"');
  const closeMain = html.indexOf("</main>", mIdx);
  if (mIdx >= 0 && oIdx > mIdx && oIdx < closeMain) fails.push("2: #langOverlay inside <main>");
}

// 3. The overlay must sit ABOVE the language step (z-index ordering)
{
  const ov = css.match(/\.langov\{[^}]*z-index:(\d+)/);
  const st = css.match(/#langStep\{[^}]*z-index:(\d+)/);
  if (ov && st && Number(ov[1]) <= Number(st[1])) fails.push("3: overlay z-index " + ov[1] + " <= langStep " + st[1]);
}

// 4. firstboot must hide the whole stage (header/main/footer)
if (!/body\.firstboot\s+header[^{]*\{[^}]*display:\s*none/.test(css)) fails.push("4: firstboot does not hide header");
if (!/body\.firstboot\s+main[^{]*\{[^}]*display:\s*none/.test(css)) fails.push("4b: firstboot does not hide main");
if (!/body\.firstboot\s+footer[^{]*\{[^}]*display:\s*none/.test(css)) fails.push("4c: firstboot does not hide footer");

// 5. .loginerr must NOT declare display (it neutralized .hidden by order)
if (/\.loginerr\{[^}]*display:/.test(css)) fails.push("5: .loginerr declares display");

// 6. The language step must be revealed via style.display on first run
if (!/langStep"\)\.style\.display\s*=\s*"flex"/.test(js)) fails.push("6: langStep is not revealed via style.display");
if (!/langOverlay"\)\.style\.display\s*=\s*"flex"/.test(js)) fails.push("6b: langOverlay is not revealed via style.display");

// 7. The splash replay must retrigger the draw on the real path selector
if (!/querySelector\("svg path"\)/.test(js)) fails.push("7: splash draw replay selector missing");

if (fails.length) {
  console.log("BOOTFLOW FAILED: " + fails.join(" · "));
  process.exit(1);
}
console.log("BOOTFLOW PASSED: the six boot-flow contracts hold");
