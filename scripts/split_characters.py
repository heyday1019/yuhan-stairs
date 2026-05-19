"""Split a sprite sheet of N×M characters on a black background into separate
transparent PNGs, one per cell. Applies the same smoothstep alpha mapping as
remove_black_bg.py and trims to the alpha bbox.

Usage:
    python scripts/split_characters.py <sheet.png> <out_dir> [cols=4] [rows=3] [low=30] [high=90]
"""
from __future__ import annotations
import sys
from pathlib import Path
import numpy as np
from PIL import Image


# 12 character labels matching ca2.png reading order: top-left → bottom-right.
NAMES = [
    "pink-beanie",
    "red-strawberry",
    "orange-carrot",
    "yellow-star",
    "green-frog",
    "cyan-beanie",
    "blue-night",
    "purple-witch",
    "magenta-bow",
    "white-bunny",
    "black-skull",
    "crystal-tophat",
]


def soft_alpha_mask(img: np.ndarray, low: int, high: int) -> np.ndarray:
    rgb = img[:, :, :3].astype(np.int32)
    m = rgb.max(axis=2)
    t = np.clip((m - low) / max(1, (high - low)), 0.0, 1.0)
    s = t * t * (3.0 - 2.0 * t)
    return (img[:, :, 3].astype(np.float32) * s).clip(0, 255).astype(np.uint8)


def split(sheet: Path, out_dir: Path, cols: int, rows: int, low: int, high: int) -> list[Path]:
    img = np.array(Image.open(sheet).convert("RGBA"))
    img[:, :, 3] = soft_alpha_mask(img, low, high)

    H, W = img.shape[:2]
    cell_w = W // cols
    cell_h = H // rows
    out_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    for r in range(rows):
        for c in range(cols):
            idx = r * cols + c
            y0c, y1c = r * cell_h, (r + 1) * cell_h
            x0c, x1c = c * cell_w, (c + 1) * cell_w
            cell = img[y0c:y1c, x0c:x1c]
            alpha = cell[:, :, 3]
            mask = alpha > 12
            if not mask.any():
                print(f"[{idx + 1:02d}] empty cell, skip")
                continue
            rows_any = np.any(mask, axis=1)
            cols_any = np.any(mask, axis=0)
            y0, y1 = int(np.argmax(rows_any)), int(len(rows_any) - 1 - np.argmax(rows_any[::-1]))
            x0, x1 = int(np.argmax(cols_any)), int(len(cols_any) - 1 - np.argmax(cols_any[::-1]))
            pad = 8
            y0 = max(0, y0 - pad)
            y1 = min(cell.shape[0] - 1, y1 + pad)
            x0 = max(0, x0 - pad)
            x1 = min(cell.shape[1] - 1, x1 + pad)
            crop = cell[y0 : y1 + 1, x0 : x1 + 1]
            name = NAMES[idx] if idx < len(NAMES) else f"char-{idx + 1:02d}"
            out = out_dir / f"bunny-{idx + 1:02d}-{name}.png"
            Image.fromarray(crop).save(out, optimize=True)
            written.append(out)
            print(f"[{idx + 1:02d}] {out.name}: {crop.shape[1]}x{crop.shape[0]} opacity={(crop[:,:,3]==255).mean()*100:.0f}%")

    return written


def make_preview_grid(sprites: list[Path], dst: Path, cols: int, cell: int = 220, bg: tuple = (40, 40, 50)) -> None:
    rows = (len(sprites) + cols - 1) // cols
    grid = Image.new("RGB", (cell * cols, cell * rows), bg)
    for i, p in enumerate(sprites):
        im = Image.open(p).convert("RGBA")
        im.thumbnail((cell - 16, cell - 16))
        x = (i % cols) * cell + (cell - im.width) // 2
        y = (i // cols) * cell + (cell - im.height) // 2
        grid.paste(im, (x, y), im)
    grid.save(dst)
    print(f"preview grid saved to {dst}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    sheet = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
    rows = int(sys.argv[4]) if len(sys.argv) > 4 else 3
    low = int(sys.argv[5]) if len(sys.argv) > 5 else 30
    high = int(sys.argv[6]) if len(sys.argv) > 6 else 90
    sprites = split(sheet, out_dir, cols, rows, low, high)
    if sprites:
        make_preview_grid(sprites, out_dir / "_preview_grid.png", cols)
