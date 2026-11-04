const fs = require("fs");
const s = fs.readFileSync(process.argv[2], "utf8");
let inS1 = 0, inS2 = 0, inT = 0, esc = false;
const st = [];
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  if (esc) { esc = false; continue; }
  if (inT) { if (c === "\\") esc = true; else if (c === "`") inT = 0; continue; }
  if (inS2) { if (c === "\\") esc = true; else if (c === '"') inS2 = 0; continue; }
  if (inS1) { if (c === "\\") esc = true; else if (c === "'") inS1 = 0; continue; }
  if (c === "`") { inT = 1; continue; }
  if (c === "'") { inS1 = 1; continue; }
  if (c === '"') { inS2 = 1; continue; }
  if ("{[(".includes(c)) st.push(c);
  if ("}])".includes(c)) {
    const o = st.pop();
    const m = { "(": ")", "[": "]", "{": "}" };
    if (m[o] !== c) console.log("desbalance línea ~" + s.slice(0, i).split("\n").length + " : " + c + " esperaba cerrar " + o);
  }
}
console.log("pila final:", st.length, "| abiertos:", inS1, inS2, inT);
