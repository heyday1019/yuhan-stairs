"""Split ca3.png (6 cols × 4 rows = 24 sprites) into idle/jump pairs.

Layout: each row has 3 characters; for each character, the column pair (idle, jump)
sits side by side. Character order matches ca2.png.

Strategy:
  1. Crop each cell.
  2. PIL ImageDraw.floodfill from the 4 cell corners — the checker background gets
     painted with a magenta marker. floodfill's thresh handles the alternating
     check colors as a single connected blob.
  3. Mark marker pixels alpha=0 in an RGBA copy.
  4. scipy.ndimage.label the remaining mask, keep the component closest to
     cell center (penalizes by distance + favors size).
  5. Bbox-trim with padding and save.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC = Path("ca3.png")
OUT_DIR = Path("public/characters")
COLS, ROWS = 6, 4
FLOOD_THRESH = 35
MARKER = (255, 0, 255)
PAD = 12

NAMES = [
    "pink-beanie", "red-strawberry", "orange-carrot",
    "yellow-star", "green-frog", "cyan-beanie",
    "blue-night", "purple-witch", "magenta-bow",
    "white-bunny", "black-skull", "crystal-tophat",
]


def main() -> None:
    src_img = Image.open(SRC).convert("RGB")
    W, H = src_img.size
    cw, ch = W // COLS, H // ROWS
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    for r in range(ROWS):
        for c in range(COLS):
            char_idx = r * 3 + (c // 2)
            state = "idle" if c % 2 == 0 else "jump"
            name = NAMES[char_idx] if char_idx < len(NAMES) else f"char-{char_idx:02d}"

            cell = src_img.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)).copy()
            # Floodfill checkered background from each corner
            for seed in [(0, 0), (cell.width - 1, 0), (0, cell.height - 1), (cell.width - 1, cell.height - 1)]:
                ImageDraw.floodfill(cell, seed, MARKER, thresh=FLOOD_THRESH)

            arr = np.array(cell)
            bg_mask = (arr[..., 0] == MARKER[0]) & (arr[..., 1] == MARKER[1]) & (arr[..., 2] == MARKER[2])

            rgba = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.uint8)
            rgba[..., :3] = arr
            rgba[bg_mask, :3] = 0
            rgba[..., 3] = np.where(bg_mask, 0, 255).astype(np.uint8)

            mask = ~bg_mask
            labels, n_labels = ndimage.label(mask)
            if n_labels == 0:
                print(f"[{name}-{state}] no content, skip")
                continue

            cy, cx = cell.height / 2, cell.width / 2
            centers = ndimage.center_of_mass(mask, labels, range(1, n_labels + 1))
            sizes = ndimage.sum(mask, labels, range(1, n_labels + 1))
            best_label = None
            best_score = -1.0
            R = np.hypot(cy, cx) / 2
            for li, (size, (yy, xx)) in enumerate(zip(sizes, centers), start=1):
                d = np.hypot(yy - cy, xx - cx)
                score = size / (1 + (d * d) / (R * R + 1e-6))
                if score > best_score:
                    best_score = score
                    best_label = li

            keep = labels == best_label
            rgba[~keep, 3] = 0

            rows_any = keep.any(axis=1)
            cols_any = keep.any(axis=0)
            y0, y1 = int(np.argmax(rows_any)), int(len(rows_any) - 1 - np.argmax(rows_any[::-1]))
            x0, x1 = int(np.argmax(cols_any)), int(len(cols_any) - 1 - np.argmax(cols_any[::-1]))
            y0 = max(0, y0 - PAD)
            y1 = min(rgba.shape[0] - 1, y1 + PAD)
            x0 = max(0, x0 - PAD)
            x1 = min(rgba.shape[1] - 1, x1 + PAD)
            crop = rgba[y0 : y1 + 1, x0 : x1 + 1]

            out = OUT_DIR / f"bunny-{char_idx + 1:02d}-{name}-{state}.png"
            Image.fromarray(crop, "RGBA").save(out, optimize=True)
            written.append(out)
            print(f"[{char_idx + 1:02d}] {out.name}: {crop.shape[1]}x{crop.shape[0]}")

    # Preview grid: 6 cols × 4 rows
    if written:
        cell_size = 200
        grid = Image.new("RGB", (cell_size * COLS, cell_size * ROWS), (40, 40, 50))
        for i, p in enumerate(written):
            im = Image.open(p).convert("RGBA")
            im.thumbnail((cell_size - 16, cell_size - 16))
            x = (i % COLS) * cell_size + (cell_size - im.width) // 2
            y = (i // COLS) * cell_size + (cell_size - im.height) // 2
            grid.paste(im, (x, y), im)
        grid.save(OUT_DIR / "_preview_ca3_grid.png")
        print("preview grid saved")


if __name__ == "__main__":
    main()
