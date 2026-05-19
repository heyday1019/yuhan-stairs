"""Re-extract the black bunny (cell #11 in ca2.png) using floodfill-based
background detection instead of luminance thresholding. The luminance approach
fails for the black bunny because its body pixels are also near-black and get
erased along with the background.

Steps:
  1. Crop cell 11 (row 2, col 2) from ca2.png.
  2. PIL ImageDraw.floodfill from each of the 4 corners with a color tolerance
     to flood-fill the connected background only (does not cross the neon
     glow that surrounds each character).
  3. Replace the floodfill marker color with alpha=0 and restore body pixels.
  4. Bbox-trim and save to public/characters/bunny-11-black-skull.png.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

SRC = Path("ca2.png")
DST = Path("public/characters/bunny-11-black-skull.png")
COLS, ROWS = 4, 3
CELL_INDEX = 10  # 0-based, so 10 = cell #11 (row 2, col 2)
FLOOD_THRESH = 30  # color distance tolerance for floodfill — keep small so it doesn't cross the glow
MARKER = (255, 0, 255)  # magenta marker = unique to flag background


def main() -> None:
    img = Image.open(SRC).convert("RGB")
    W, H = img.size
    cw, ch = W // COLS, H // ROWS
    r, c = divmod(CELL_INDEX, COLS)
    cell = img.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))

    # Floodfill from each corner. PIL operates in place.
    for seed in [(0, 0), (cell.width - 1, 0), (0, cell.height - 1), (cell.width - 1, cell.height - 1)]:
        ImageDraw.floodfill(cell, seed, MARKER, thresh=FLOOD_THRESH)

    arr = np.array(cell)
    bg_mask = (arr[:, :, 0] == MARKER[0]) & (arr[:, :, 1] == MARKER[1]) & (arr[:, :, 2] == MARKER[2])

    rgba = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.uint8)
    rgba[..., :3] = arr
    rgba[..., 3] = np.where(bg_mask, 0, 255)
    # restore body pixels that got marked: in our case mask covers ONLY background, so body is intact.
    # The marker also replaced background RGB; that's fine since alpha=0 there.

    # Crop to bbox
    rows_any = np.any(~bg_mask, axis=1)
    cols_any = np.any(~bg_mask, axis=0)
    y0, y1 = int(np.argmax(rows_any)), int(len(rows_any) - 1 - np.argmax(rows_any[::-1]))
    x0, x1 = int(np.argmax(cols_any)), int(len(cols_any) - 1 - np.argmax(cols_any[::-1]))
    pad = 8
    y0 = max(0, y0 - pad)
    y1 = min(rgba.shape[0] - 1, y1 + pad)
    x0 = max(0, x0 - pad)
    x1 = min(rgba.shape[1] - 1, x1 + pad)
    crop = rgba[y0 : y1 + 1, x0 : x1 + 1]

    # Anti-alias the alpha edge with a 1-pixel soft border by blurring alpha only
    DST.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(crop, "RGBA").save(DST, optimize=True)
    print(f"wrote {DST}: {crop.shape[1]}x{crop.shape[0]} opacity={(crop[:,:,3]==255).mean()*100:.0f}%")

    # white-bg preview
    a = crop[:, :, 3:4] / 255.0
    comp = (crop[:, :, :3] * a + 255 * (1 - a)).astype(np.uint8)
    Image.fromarray(comp).save(DST.parent / "_preview_black_on_white.png")


if __name__ == "__main__":
    main()
