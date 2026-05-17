"""
Upscale public/images/Generated_image.png to ~8K-class width for the studio backdrop.
Output: public/images/studio-nepal-wallpaper.jpg (high-quality JPEG).
Run from repo root: python scripts/upscale-wallpaper.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "images" / "Generated_image.png"
OUT_JPG = ROOT / "public" / "images" / "studio-nepal-wallpaper.jpg"

# 8K UHD width class (7680): sharper when stretched full-screen; height follows aspect.
TARGET_W = 7680


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing source image: {SRC}")

    img = Image.open(SRC)
    w, h = img.size
    if w <= 0 or h <= 0:
        raise SystemExit("Invalid image dimensions")

    new_w = TARGET_W
    new_h = max(1, int(round(h * (TARGET_W / w))))

    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # JPEG has no alpha — flatten onto deep teal if source uses transparency.
    if resized.mode != "RGBA":
        resized = resized.convert("RGBA")
    background = Image.new("RGB", resized.size, (14, 40, 52))
    background.paste(resized, mask=resized.split()[3])
    rgb = background

    OUT_JPG.parent.mkdir(parents=True, exist_ok=True)
    rgb.save(OUT_JPG, format="JPEG", quality=96, optimize=True, progressive=True, subsampling=0)
    print(f"Wrote {new_w}x{new_h} -> {OUT_JPG} ({OUT_JPG.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
