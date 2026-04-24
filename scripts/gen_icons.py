"""Generate PNG icons for the DEXA Prep PWA manifest.

Produces:
  public/icons/icon-192.png        — standard 192x192
  public/icons/icon-512.png        — standard 512x512
  public/icons/icon-512-maskable.png — full-bleed 512x512 with content at 75% for safe zone
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

INK_900 = (10, 14, 26, 255)
AMBER = (245, 158, 11, 255)
BONE_100 = (244, 243, 233, 255)

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def draw_book(draw, cx, cy, size, stroke):
    """Two facing book pages, centered on (cx, cy), total box size 'size'."""
    half = size / 2
    # Left page: slight rhombus shape
    left = [
        (cx - half, cy - half),
        (cx, cy - half + 2),
        (cx, cy + half - 2),
        (cx - half, cy + half),
    ]
    right = [
        (cx + half, cy - half),
        (cx, cy - half + 2),
        (cx, cy + half - 2),
        (cx + half, cy + half),
    ]
    draw.polygon(left, outline=AMBER, fill=None, width=stroke)
    draw.polygon(right, outline=AMBER, fill=None, width=stroke)
    # Page lines
    for frac in (0.25, 0.45, 0.65):
        y = cy - half + size * frac
        lx0 = cx - half * 0.78
        lx1 = cx - half * 0.12
        rx0 = cx + half * 0.12
        rx1 = cx + half * 0.78
        draw.line([(lx0, y), (lx1, y)], fill=AMBER + (0,) if False else (245, 158, 11, 180), width=max(1, stroke // 2))
        draw.line([(rx0, y), (rx1, y)], fill=(245, 158, 11, 180), width=max(1, stroke // 2))


def load_font(size):
    # Try common system fonts; fall back to default if missing.
    candidates = [
        "C:/Windows/Fonts/seguisb.ttf",  # Segoe UI Semibold
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except Exception:
            continue
    return ImageFont.load_default()


def make_icon(size, maskable=False, bleed=False):
    img = Image.new("RGBA", (size, size), INK_900)
    draw = ImageDraw.Draw(img)

    # Rounded background (visual corners). For maskable, full bleed = no rounding.
    if not bleed:
        # Draw rounded rectangle over a transparent base for corners
        bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        bd = ImageDraw.Draw(bg)
        radius = int(size * 0.18)
        bd.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=INK_900)
        img = bg
        draw = ImageDraw.Draw(img)

    # Content area: book + text. Scale down for maskable safe zone (75%).
    content_scale = 0.75 if maskable else 1.0
    book_box = size * 0.48 * content_scale
    cx = size / 2
    cy = size * (0.40 if not maskable else 0.42)

    stroke = max(2, int(size * 0.025 * content_scale))
    draw_book(draw, cx, cy, book_box, stroke)

    # Text "DEXA"
    text = "DEXA"
    font_size = int(size * 0.17 * content_scale)
    font = load_font(font_size)
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
    except AttributeError:
        tw, th = font.getsize(text)
    tx = (size - tw) / 2
    ty = cy + book_box / 2 + int(size * 0.05 * content_scale)
    draw.text((tx, ty), text, font=font, fill=AMBER)

    return img


if __name__ == "__main__":
    make_icon(192).save(OUT_DIR / "icon-192.png")
    make_icon(512).save(OUT_DIR / "icon-512.png")
    # Maskable: full bleed ink background, content scaled into safe zone
    mask = Image.new("RGBA", (512, 512), INK_900)
    mask_draw = ImageDraw.Draw(mask)
    # Compose the inner art by calling make_icon with maskable=True then paste it
    inner = make_icon(512, maskable=True, bleed=True)
    mask.paste(inner, (0, 0), inner)
    mask.save(OUT_DIR / "icon-512-maskable.png")
    print("Icons written to", OUT_DIR)
