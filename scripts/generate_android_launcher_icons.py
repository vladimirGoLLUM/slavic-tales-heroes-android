from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "pwa-icon-512.png"
RES_DIR = ROOT / "android" / "app" / "src" / "main" / "res"


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="PNG", optimize=True)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Source icon not found: {SOURCE}")

    src = Image.open(SOURCE).convert("RGBA")

    # Legacy launcher icons (square). Android will mask them as needed.
    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    for folder, size in densities.items():
        resized = src.resize((size, size), Image.Resampling.LANCZOS)
        save_png(resized, RES_DIR / folder / "ic_launcher.png")
        save_png(resized, RES_DIR / folder / "ic_launcher_round.png")

    # Adaptive icon foreground (kept fairly large; safe zone is handled by OS masking).
    # 432x432 is the recommended canvas for adaptive icons (4x of 108dp).
    fg = src.resize((432, 432), Image.Resampling.LANCZOS)
    save_png(fg, RES_DIR / "drawable" / "ic_launcher_foreground.png")


if __name__ == "__main__":
    main()

