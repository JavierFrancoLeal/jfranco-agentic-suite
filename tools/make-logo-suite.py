# Trasunto logo suite — the designer's delivery pack.
# Draws the one-stroke eye from the SVG path data and composes the lockups.
import os, math, sys
from PIL import Image, ImageDraw, ImageFont

SCALE = 8            # 64-unit viewBox → 512px canvas
S = 512
FONT = "/System/Library/Fonts/Helvetica.ttc"
BLUE = (0x4D, 0x6B, 0xFE)
INK = (0x11, 0x18, 0x27)
WHITE = (0xFF, 0xFF, 0xFF)

def F(size, bold=False):
    try:
        return ImageFont.truetype(FONT, size, index=1 if bold else 0)
    except Exception:
        return ImageFont.truetype(FONT, size, index=0)

def cubic_points(p0, p1, p2, p3, n=64):
    pts = []
    for i in range(n + 1):
        t = i / n
        a = (1 - t) ** 3; b = 3 * t * (1 - t) ** 2; c = 3 * t * t * (1 - t); d = t ** 3
        pts.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
                    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return pts

def draw_eye(draw, color, width=5, translate=(0, 0)):
    tx, ty = translate
    def P(x, y): return (x * SCALE + tx, y * SCALE + ty)
    w = width * SCALE
    # outer almond + inner iris (the exact SVG path of Fanal)
    segs = [
        cubic_points(P(10, 32), P(10, 22), P(16, 14), P(32, 14)),
        cubic_points(P(32, 14), P(48, 14), P(54, 22), P(54, 32)),
        cubic_points(P(54, 32), P(54, 42), P(48, 50), P(32, 50)),
        cubic_points(P(32, 50), P(20, 50), P(12.5, 45.2), P(10.5, 38.5)),
        cubic_points(P(10.5, 38.5), P(14, 42.5), P(20, 41), P(25.4, 34.8)),
        cubic_points(P(38.6, 34.8), P(38.6, 31.4), P(36.6, 28.2), P(32, 22.5)),
        cubic_points(P(32, 22.5), P(27.4, 28.2), P(25.4, 31.4), P(25.4, 34.8)),
    ]
    for pts in segs:
        draw.line(pts, fill=color, width=w, joint="curve")
    # iris bottom arc: circle center (32,34.8) r 6.6, drawn 0°→180° (passes the bottom)
    cx, cy, r = P(32, 34.8)[0], P(32, 34.8)[1], int(6.6 * SCALE)
    draw.arc([cx - r, cy - r, cx + r, cy + r], start=0, end=180, fill=color, width=w)

def eye_image(color, size=512):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    s = size / 64
    segs = [
        cubic_points((10, 32), (10, 22), (16, 14), (32, 14)),
        cubic_points((32, 14), (48, 14), (54, 22), (54, 32)),
        cubic_points((54, 32), (54, 42), (48, 50), (32, 50)),
        cubic_points((32, 50), (20, 50), (12.5, 45.2), (10.5, 38.5)),
        cubic_points((10.5, 38.5), (14, 42.5), (20, 41), (25.4, 34.8)),
        cubic_points((38.6, 34.8), (38.6, 31.4), (36.6, 28.2), (32, 22.5)),
        cubic_points((32, 22.5), (27.4, 28.2), (25.4, 31.4), (25.4, 34.8)),
    ]
    w = int(5 * s)
    for pts in segs:
        d.line([(x * s, y * s) for x, y in pts], fill=color, width=w, joint="curve")
    cx, cy, r = 32 * s, 34.8 * s, 6.6 * s
    d.arc([cx - r, cy - r, cx + r, cy + r], start=0, end=180, fill=color, width=w)
    return im

def lockup(eye_color, text_color, out, size=400, wordmark="TRASUNTO"):
    icon = eye_image(eye_color, 512)
    icon = icon.resize((size, size), Image.LANCZOS)
    fnt = F(int(size * 0.62), True)
    tmp = Image.new("RGBA", (10, 10))
    bbox = ImageDraw.Draw(tmp).textbbox((0, 0), "FRANCO VISION", font=fnt)
    tw = bbox[2] - bbox[0]
    gap = int(size * 0.28)
    W = size + gap + tw + int(size * 0.1)
    H = size + int(size * 0.16)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    im.paste(icon, (0, (H - size) // 2), icon)
    d = ImageDraw.Draw(im)
    d.text((size + gap, (H - (bbox[3] - bbox[1])) // 2 - bbox[1] - int(size * 0.03)), wordmark, font=fnt, fill=text_color)
    im.save(out)
    return out

def main(outdir):
    os.makedirs(outdir, exist_ok=True)
    files = {}
    files["trasunto-lockup.png"] = lockup(BLUE, INK, f"{outdir}/trasunto-lockup.png", 400)
    files["franco-vision-lockup.png"] = files["trasunto-lockup.png"]
    files["trasunto-lockup-mono.png"] = lockup(INK, INK, f"{outdir}/trasunto-lockup-mono.png", 400)
    files["franco-vision-lockup-mono.png"] = files["trasunto-lockup-mono.png"]
    files["trasunto-lockup-white.png"] = lockup(WHITE, WHITE, f"{outdir}/trasunto-lockup-white.png", 400)
    files["franco-vision-lockup-white.png"] = files["trasunto-lockup-white.png"]
    eye_image(BLUE, 512).save(f"{outdir}/franco-vision-icon.png"); files["franco-vision-icon.png"] = "franco-vision-icon.png"
    eye_image(INK, 512).save(f"{outdir}/franco-vision-icon-mono.png"); files["franco-vision-icon-mono.png"] = "franco-vision-icon-mono.png"
    eye_image(WHITE, 512).save(f"{outdir}/franco-vision-icon-white.png"); files["franco-vision-icon-white.png"] = "franco-vision-icon-white.png"
    eye_image(BLUE, 64).save(f"{outdir}/favicon.png"); files["favicon.png"] = "favicon.png"
    readme = "# Trasunto — logo suite (designer's delivery pack)\n\n" \
        "| Prototype | File | Use |\n|---|---|---|\n" \
        "| Primary lockup (horizontal) | franco-vision-lockup.png | documents, letterheads |\n" \
        "| Monochrome lockup | franco-vision-lockup-mono.png | fax, b/w print |\n" \
        "| Inverted lockup | franco-vision-lockup-white.png | dark backgrounds |\n" \
        "| Icon (primary) | franco-vision-icon.png | app, social |\n" \
        "| Icon (mono) | franco-vision-icon-mono.png | stamps, b/w |\n" \
        "| Icon (inverted) | franco-vision-icon-white.png | dark UI |\n" \
        "| Favicon | favicon.png | browser tabs |\n\n" \
        "Colors: blue #4D6BFE · ink #111827. One-stroke eye — the brand mark of Trasunto / Fanal.\n" \
        "Source vectors: assets/le-veilleux-one-stroke.svg · assets/le-veilleux-mark.svg\n"
    with open(f"{outdir}/README.md", "w") as f:
        f.write(readme)
    files["README.md"] = "README.md"
    print("logo suite generada en", outdir, "→", len(files), "archivos")

main(sys.argv[1] if len(sys.argv) > 1 else "tools/logo-suite")
