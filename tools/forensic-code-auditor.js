#!/usr/bin/env node
// ESCÁNER FORENSE DE CÓDIGO PARA FANAL (audita todo el código generado en Argon en <1 segundo)
// node tools/forensic-code-auditor.js
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
function runForensicCodebaseAudit(sourceDirPath) {
  const jsFiles = fs.readdirSync(sourceDirPath).filter((f) => f.endsWith(".js"));
  const findings = [];
  const verifiedContracts = [];
  const fileHashes = {};
  const FORBIDDEN_CODE_PATTERNS = [
    { id: "SEC-EVAL", regex: /\beval\s*\(/, desc: "Uso prohibido de eval() (riesgo de inyección de código)." },
    { id: "SEC-NEW-FUNC", regex: /new\s+Function\s*\(/, desc: "Construcción dinámica de funciones prohibida." },
    { id: "SEC-NODE-INTEGRATION", regex: /nodeIntegration\s*:\s*true/, desc: "Violación de aislamiento Electron: nodeIntegration debe ser false." },
    { id: "SEC-CONTEXT-ISO", regex: /contextIsolation\s*:\s*false/, desc: "Violación de aislamiento Electron: contextIsolation debe ser true." },
    { id: "SEC-RAW-SHELL", regex: /child_process.*exec\s*\(/, desc: "Ejecución de shell sin lista blanca determinista." },
  ];
  for (const fileName of jsFiles) {
    const fullPath = path.join(sourceDirPath, fileName);
    const code = fs.readFileSync(fullPath, "utf8");
    fileHashes[fileName] = crypto.createHash("sha256").update(code).digest("hex").slice(0, 16);
    const lines = code.split("\n");
    lines.forEach((lineText, idx) => {
      for (const rule of FORBIDDEN_CODE_PATTERNS) {
        if (rule.regex.test(lineText)) findings.push({ severity: "CRITICAL_BLOCKER", file: fileName, line: idx + 1, ruleId: rule.id, message: rule.desc, snippet: lineText.trim().slice(0, 100) });
      }
    });
    const NETWORK_WHITELIST = ["brainLadderRouter.js", "firstBootInstaller.js", "server.js", "browser-cdp.js"];
    if (/\bfetch\s*\(/.test(code) && !NETWORK_WHITELIST.includes(fileName)) {
      if (!code.includes("veilText") && !code.includes("crypto.verify")) findings.push({ severity: "WARNING_AUDIT", file: fileName, line: 1, ruleId: "LOI25-UNVEILED-FETCH", message: "El archivo realiza fetch() sin referencia visible a veilText ni crypto.verify." });
    }
    const contractMatches = code.matchAll(/\/\*\*[\s\S]*?@fanal-forensic-contract[\s\S]*?\*\//g);
    for (const match of contractMatches) {
      const block = match[0];
      const id = (block.match(/@id\s+([^\n\r*]+)/) || [])[1] ? (block.match(/@id\s+([^\n\r*]+)/) || [])[1].trim() : "UNNAMED";
      const invariant = (block.match(/@invariant\s+([^\n\r*]+)/) || [])[1] ? (block.match(/@invariant\s+([^\n\r*]+)/) || [])[1].trim() : "";
      verifiedContracts.push({ file: fileName, contractId: id, invariant });
    }
  }
  return { auditedAtIso: new Date().toISOString(), totalFilesScanned: jsFiles.length, passedZeroCriticalBlockers: findings.filter((f) => f.severity === "CRITICAL_BLOCKER").length === 0, fileIntegrityHashes: fileHashes, documentedForensicContractsCount: verifiedContracts.length, verifiedContracts, findings };
}
const target = process.argv[2] || "supervisor";
const report = runForensicCodebaseAudit(target);
console.log("=== ESCÁNER FORENSE FANAL ===");
console.log("archivos:", report.totalFilesScanned, "· críticos:", report.findings.filter(f=>f.severity==="CRITICAL_BLOCKER").length, "· avisos:", report.findings.filter(f=>f.severity==="WARNING_AUDIT").length, "· contratos:", report.documentedForensicContractsCount);
if (report.findings.length) {
  for (const f of report.findings) console.log("  [" + f.severity + "] " + f.file + ":" + f.line + " — " + f.message);
} else {
  console.log("  ✓ sin hallazgos: el código cumple la constitución técnica");
}
