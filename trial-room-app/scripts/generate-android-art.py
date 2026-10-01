"""Generate Android launcher and splash art from the Phenawa hanger favicon.

Run from trial-room-app with Pillow installed: python3 scripts/generate-android-art.py
"""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1] / "android/app/src/main/res"
PURPLE = (108, 62, 184, 255)
WHITE = (255, 255, 255, 255)


def hanger(draw: ImageDraw.ImageDraw, center: tuple[float, float], size: float) -> None:
    x, y = center
    stroke = max(2, round(size * 0.042))
    hook = [
        (x, y - size * 0.10),
        (x, y - size * 0.22),
        (x + size * 0.045, y - size * 0.27),
        (x + size * 0.09, y - size * 0.24),
        (x + size * 0.09, y - size * 0.20),
        (x + size * 0.03, y - size * 0.13),
    ]
    body = [
        (x, y - size * 0.10),
        (x - size * 0.34, y + size * 0.21),
        (x + size * 0.34, y + size * 0.21),
        (x, y - size * 0.10),
    ]
    for path in (hook, body):
        draw.line(path, fill=WHITE, width=stroke, joint="curve")
        radius = stroke / 2
        for px, py in path:
            draw.ellipse((px - radius, py - radius, px + radius, py + radius), fill=WHITE)


def render(width: int, height: int, kind: str, destination: Path) -> None:
    scale = 3 if max(width, height) <= 432 else 2
    w, h = width * scale, height * scale
    image = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    short = min(w, h)
    center = (w / 2, h / 2)

    if kind == "splash":
        draw.rectangle((0, 0, w, h), fill=WHITE)
        side = short * 0.29
        box = (center[0] - side / 2, center[1] - side / 2,
               center[0] + side / 2, center[1] + side / 2)
        draw.rounded_rectangle(box, radius=side * 0.23, fill=PURPLE)
        hanger(draw, center, side * 0.77)
    elif kind == "foreground":
        hanger(draw, center, short * 0.55)
    else:
        box = (0, 0, w - 1, h - 1)
        if kind == "round":
            draw.ellipse(box, fill=PURPLE)
        else:
            draw.rounded_rectangle(box, radius=short * 0.22, fill=PURPLE)
        hanger(draw, center, short * 0.70)

    image.resize((width, height), Image.Resampling.LANCZOS).save(destination)


for density, legacy, foreground in (
    ("mdpi", 48, 108),
    ("hdpi", 72, 162),
    ("xhdpi", 96, 216),
    ("xxhdpi", 144, 324),
    ("xxxhdpi", 192, 432),
):
    folder = ROOT / f"mipmap-{density}"
    render(legacy, legacy, "square", folder / "ic_launcher.png")
    render(legacy, legacy, "round", folder / "ic_launcher_round.png")
    render(foreground, foreground, "foreground", folder / "ic_launcher_foreground.png")

for folder, width, height in (
    ("drawable", 480, 320),
    ("drawable-land-mdpi", 480, 320),
    ("drawable-land-hdpi", 800, 480),
    ("drawable-land-xhdpi", 1280, 720),
    ("drawable-land-xxhdpi", 1600, 960),
    ("drawable-land-xxxhdpi", 1920, 1280),
    ("drawable-port-mdpi", 320, 480),
    ("drawable-port-hdpi", 480, 800),
    ("drawable-port-xhdpi", 720, 1280),
    ("drawable-port-xxhdpi", 960, 1600),
    ("drawable-port-xxxhdpi", 1280, 1920),
):
    render(width, height, "splash", ROOT / folder / "splash.png")

print("Generated Phenawa Android launcher and splash art")
