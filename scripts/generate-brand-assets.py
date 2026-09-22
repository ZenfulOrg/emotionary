"""
Regenerates the brand raster assets from the brand guide's rules:
app icon, Android adaptive icon layers, splash wordmark, favicon, grain tile.

    python3 scripts/generate-brand-assets.py   (needs Pillow)

Ink ground, cream lowercase "e" with the acid period, three hairline rings,
and the planets — acid, blue, pink — riding the middle ring at two o'clock.
"""
import math
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

INK = (0x18, 0x33, 0x4D)
CREAM = (0xF5, 0xF0, 0xE6)
ACID = (0xF5, 0xC4, 0x00)
BLUE = (0x1F, 0x6B, 0x9E)
PINK = (0xE9, 0x82, 0x8C)
HAIRLINE = (0x3B, 0x51, 0x65)
FONT = 'node_modules/@expo-google-fonts/cormorant-garamond/500Medium/CormorantGaramond_500Medium.ttf'
SUPERSAMPLE = 2


def grain(img, amount=0.045):
    """Every page wears a fine grain at 4.5 percent."""
    noise = Image.effect_noise(img.size, 64).convert('L')
    return Image.blend(img, Image.merge('RGB', (noise, noise, noise)), amount)


def planets(layer, cx, cy, scale):
    """Acid 11, blue 9, pink 7 — 7 apart, tilted 12 degrees, glowing."""
    sizes = [(11, ACID), (9, BLUE), (7, PINK)]
    x = -(11 + 7 + 9 + 7 + 7) / 2
    points = []
    for diameter, color in sizes:
        points.append((x + diameter / 2, diameter, color))
        x += diameter + 7
    tilt = math.radians(12)
    glow = Image.new('RGBA', layer.size, (0, 0, 0, 0))
    dots = Image.new('RGBA', layer.size, (0, 0, 0, 0))
    glow_draw, dot_draw = ImageDraw.Draw(glow), ImageDraw.Draw(dots)
    for offset, diameter, color in points:
        px = cx + offset * scale * math.cos(tilt)
        py = cy + offset * scale * math.sin(tilt)
        r = diameter * scale / 2
        glow_draw.ellipse([px - r * 1.8, py - r * 1.8, px + r * 1.8, py + r * 1.8], fill=color + (110,))
        dot_draw.ellipse([px - r, py - r, px + r, py + r], fill=color + (255,))
    glow = glow.filter(ImageFilter.GaussianBlur(scale * 4))
    return Image.alpha_composite(Image.alpha_composite(layer, glow), dots)


def icon(size=1024, transparent=False, mono=False, safe=1.0):
    w = size * SUPERSAMPLE
    img = Image.new('RGBA', (w, w), (0, 0, 0, 0) if transparent else INK + (255,))
    draw = ImageDraw.Draw(img)
    ox, oy = w * 0.56, w * 0.42
    if not transparent:
        for r in (w * 0.50, w * 0.36, w * 0.22):
            draw.ellipse([ox - r, oy - r, ox + r, oy + r], outline=HAIRLINE + (255,), width=3 * SUPERSAMPLE)

    font = ImageFont.truetype(FONT, int(w * 0.74 * safe))
    ink = (255, 255, 255, 255) if mono else CREAM + (255,)
    box = draw.textbbox((0, 0), 'e', font=font)
    dot = w * 0.062 * safe
    x = w / 2 - (box[2] - box[0] + dot * 1.4) / 2 - box[0]
    y = w / 2 - (box[3] - box[1]) / 2 - box[1] + w * 0.03 * safe
    draw.text((x, y), 'e', font=font, fill=ink)
    px, py = x + box[2] + dot * 0.4, y + box[3] - dot
    draw.ellipse([px, py, px + dot, py + dot], fill=(255, 255, 255, 255) if mono else ACID + (255,))

    if not transparent:
        r = w * 0.36
        img = planets(img, ox + r * math.sin(math.radians(60)), oy - r * math.cos(math.radians(60)), w / 1024 * 3.2)
    out = img.resize((size, size), Image.LANCZOS)
    return grain(out.convert('RGB')).convert('RGBA') if not transparent else out


def splash_wordmark(width=1200, height=300):
    """The wordmark: lowercase, tracked -0.04em, one acid period. Transparent."""
    w, h = width * SUPERSAMPLE, height * SUPERSAMPLE
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, int(h * 0.62))
    track = -0.04 * font.size
    advances = [draw.textlength(ch, font=font) + track for ch in 'emotionary']
    x = (w - sum(advances) - font.size * 0.16) / 2
    y = h * 0.12
    for ch, advance in zip('emotionary', advances):
        draw.text((x, y), ch, font=font, fill=CREAM + (255,))
        x += advance
    dot = font.size * 0.12
    baseline = draw.textbbox((0, y), 'n', font=font)[3]
    draw.ellipse([x + font.size * 0.02, baseline - dot, x + font.size * 0.02 + dot, baseline], fill=ACID + (255,))
    return img.resize((width, height), Image.LANCZOS)


def grain_tile(size=192):
    random.seed(7)
    tile = Image.new('L', (size, size))
    tile.putdata([random.randint(0, 255) for _ in range(size * size)])
    return tile


if __name__ == '__main__':
    icon().convert('RGB').save('assets/images/icon.png')
    icon(transparent=True, safe=0.6).save('assets/images/android-icon-foreground.png')
    icon(transparent=True, mono=True, safe=0.6).save('assets/images/android-icon-monochrome.png')
    splash_wordmark().save('assets/images/splash-icon.png')
    favicon = planets(Image.new('RGBA', (384, 384), INK + (255,)), 192, 192, 7.0)
    favicon.resize((48, 48), Image.LANCZOS).convert('RGB').save('assets/images/favicon.png')
    grain_tile().save('assets/images/grain.png', optimize=True)
