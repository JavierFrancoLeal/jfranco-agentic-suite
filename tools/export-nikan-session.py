#!/usr/bin/env python3
# Export the Claude Cowork "Nikan" sessions from the local filesystem
# into ~/.dsh/nikan-session/ (private, readable by DSH without any
# subscription). Extracts user messages, Claude's replies and thinking.
import json, os, shutil, glob, sys

SRC = os.path.expanduser("~/Library/Application Support/Claude/local-agent-mode-sessions")
DST = os.path.expanduser("~/.dsh/nikan-session")
os.makedirs(DST, exist_ok=True)

def text_of(block):
    if isinstance(block, dict):
        if block.get("type") == "text":
            return block.get("text", "")
        if block.get("type") == "thinking":
            return block.get("thinking", "")
    return None

def parse_transcript(path):
    lines = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            role = obj.get("type")
            msg = obj.get("message", {})
            content = msg.get("content")
            if isinstance(content, str):
                lines.append((role, content))
            elif isinstance(content, list):
                for b in content:
                    t = text_of(b)
                    if t:
                        lines.append(("PENSAMIENTO" if (isinstance(b, dict) and b.get("type") == "thinking") else role, t))
    return lines

found = 0
for session_dir in glob.glob(os.path.join(SRC, "*", "*")):
    for sj in glob.glob(os.path.join(session_dir, "local_*.json")):
        try:
            meta = json.load(open(sj))
        except Exception:
            continue
        sid = meta.get("sessionId", "?")
        title = meta.get("title", "sans titre").replace("/", "-")
        if not any(k in title.lower() for k in ("nikan", "charlevoix", "plan", "startup", "affaire", "entreprise", "cv")):
            continue
        base = os.path.join(os.path.dirname(sj), os.path.basename(sj)[:-5])
        out_dir = os.path.join(DST, "sessions", sid)
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, "meta.json"), "w") as f:
            json.dump(meta, f, ensure_ascii=False, indent=1)
        all_lines = []
        for tr in glob.glob(os.path.join(base, ".claude", "projects", "*", "*.jsonl")):
            lines = parse_transcript(tr)
            all_lines.extend(lines)
        with open(os.path.join(out_dir, "conversation.txt"), "w") as f:
            f.write(f"# {title} ({sid})\n# {meta.get('createdAt', '')} → {meta.get('lastActivityAt', '')}\n\n")
            for role, t in all_lines:
                label = {"user": "👤 TÚ", "assistant": "🤖 CLAUDE", "PENSAMIENTO": "🧠 PENSAMIENTO"}.get(role, role)
                f.write(f"\n{label}:\n{t}\n")
        found += 1
        print(f"✔ {title} — {len(all_lines)} mensajes")

readme = """# Sesión Nikan — exportada de Claude Cowork (local)

Esta carpeta contiene TODAS las sesiones de Claude Cowork relacionadas con
el plan de negocios (Nikan / Franco Vision), recuperadas de los archivos
locales de tu Mac — sin suscripción, sin la app.

- `sessions/<id>/conversation.txt` — la conversación completa:
  👤 TÚ / 🤖 CLAUDE / 🧠 PENSAMIENTO (el razonamiento interno de Claude).
- `sessions/<id>/meta.json` — título, fechas y modelo de cada sesión.

El contenido es PRIVADO: no se sube a GitHub ni a ninguna nube.
"""
with open(os.path.join(DST, "README.md"), "w") as f:
    f.write(readme)
print(f"\nTotal: {found} sesiones exportadas → {DST}")
