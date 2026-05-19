"""Robust character sheet splitter.

Strategy:
  1. Floodfill the entire ca2.png from each of the 4 corners so the connected
     black background is replaced with a magenta marker. This removes the
     between-character background but leaves all character bodies (incl. the
     black bunny) untouched.
  2. Build an RGBA image where marker pixels are alpha=0.
  3. Divide into N×M cells. Within each cell, find the connected component
     of opaque pixels closest to the cell center and discard the rest. This
     drops any neighbor sprite that bled into the cell.
  4. Bbox-trim with padding and save.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC = Path("ca2.png")
OUT_DIR = Path("public/characters")
COLS, ROWS = 4, 3
FLOOD_THRESH = 35
MARKER = (255, 0, 255)
PAD = 12

NAMES = [
    "pink-beanie", "red-strawberry", "orange-carrot", "yellow-star",
    "green-frog", "cyan-beanie", "blue-night", "purple-witch",
    "magenta-bow", "white-bunny", "black-skull", "crystal-tophat",
]


def main() -> None:
    img = Image.open(SRC).convert("RGB")
    W, H = img.size

    # Step 1: floodfill background from all 4 corners
    for seed in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)]:
        ImageDraw.floodfill(img, seed, MARKER, thresh=FLOOD_THRESH)

    arr = np.array(img)
    bg_mask = (arr[..., 0] == MARKER[0]) & (arr[..., 1] == MARKER[1]) & (arr[..., 2] == MARKER[2])

    # Step 2: build RGBA — background → alpha 0, foreground → alpha 255 + original color
    rgba = np.zeros((H, W, 4), dtype=np.uint8)
    rgba[..., :3] = arr
    rgba[bg_mask, :3] = 0  # neutralize marker color where alpha=0
    rgba[..., 3] = np.where(bg_mask, 0, 255).astype(np.uint8)

    cw, ch = W // COLS, H // ROWS
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    for r in range(ROWS):
        for c in range(COLS):
            idx = r * COLS + c
            y0c, y1c = r * ch, (r + 1) * ch
            x0c, x1c = c * cw, (c + 1) * cw
            cell = rgba[y0c:y1c, x0c:x1c].copy()
            alpha = cell[:, :, 3]
            mask = alpha > 0
            if not mask.any():
                print(f"[{idx + 1:02d}] empty cell")
                continue

            labels, n_labels = ndimage.label(mask)
            if n_labels == 0:
                continue
            cy, cx = cell.shape[0] / 2, cell.shape[1] / 2
            centers = ndimage.center_of_mass(mask, labels, range(1, n_labels + 1))
            sizes = ndimage.sum(mask, labels, range(1, n_labels + 1))
            # Score: prefer big AND near center. We want the largest component whose
            # center is within ~half the cell from the cell center.
            best_label = None
            best_score = -1.0
            for li, (size, (yy, xx)) in enumerate(zip(sizes, centers), start=1):
                d = np.hypot(yy - cy, xx - cx)
                # Penalize distance: score = size / (1 + d^2 / R^2), R = quarter cell diagonal
                R = np.hypot(cy, cx) / 2
                score = size / (1 + (d * d) / (R * R + 1e-6))
                if score > best_score:
                    best_score = score
                    best_label = li

            keep = labels == best_label
            cell[~keep, 3] = 0  # drop everything except the chosen blob

            # Bbox + padding
            rows_any = keep.any(axis=1)
            cols_any = keep.any(axis=0)
            y0, y1 = int(np.argmax(rows_any)), int(len(rows_any) - 1 - np.argmax(rows_any[::-1]))
            x0, x1 = int(np.argmax(cols_any)), int(len(cols_any) - 1 - np.argmax(cols_any[::-1]))
            y0 = max(0, y0 - PAD)
            y1 = min(cell.shape[0] - 1, y1 + PAD)
            x0 = max(0, x0 - PAD)
            x1 = min(cell.shape[1] - 1, x1 + PAD)
            crop = cell[y0 : y1 + 1, x0 : x1 + 1]

            name = NAMES[idx] if idx < len(NAMES) else f"char-{idx + 1:02d}"
            out = OUT_DIR / f"bunny-{idx + 1:02d}-{name}.png"
            Image.fromarray(crop, "RGBA").save(out, optimize=True)
            written.append(out)
            edge_opaque = int((crop[0, :, 3] > 50).sum() + (crop[-1, :, 3] > 50).sum() +
                              (crop[:, 0, 3] > 50).sum() + (crop[:, -1, 3] > 50).sum())
            print(f"[{idx + 1:02d}] {out.name}: {crop.shape[1]}x{crop.shape[0]} edge-opaque={edge_opaque}")

    # Preview grid
    if written:
        cell_size = 240
        grid = Image.new("RGB", (cell_size * COLS, cell_size * ROWS), (40, 40, 50))
        for i, p in enumerate(written):
            im = Image.open(p).convert("RGBA")
            im.thumbnail((cell_size - 16, cell_size - 16))
            x = (i % COLS) * cell_size + (cell_size - im.width) // 2
            y = (i // COLS) * cell_size + (cell_size - im.height) // 2
            grid.paste(im, (x, y), im)
        grid.save(OUT_DIR / "_preview_grid.png")
        print("preview grid saved")


if __name__ == "__main__":
    main()
