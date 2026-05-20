"""Strip the ChatGPT watermark from .orig-images/bg.png and emit public/bg.png.

The watermark sits in the bottom-right corner. We paint over that strip with
a vertical gradient sampled from the row just above it so the dark "sky"
continues naturally into the bottom edge. The output is sized to a sensible
mobile width (final width 540px) so the asset is not 887*1774 px on disk.
"""
from PIL import Image

SRC = ".orig-images/bg.png"
DST = "public/bg.png"

img = Image.open(SRC).convert("RGB")
w, h = img.size

# Watermark is roughly the bottom 80 px (out of 1774). Resample the row just
# above that to use as a fill so the seam is invisible.
WM_H = 110
src_row = img.crop((0, h - WM_H - 8, w, h - WM_H))  # 8 px sample row
fill = src_row.resize((w, WM_H))
img.paste(fill, (0, h - WM_H))

# Downscale for delivery — original 887*1774 is heavy for a phone background.
TARGET_W = 540
target_h = int(h * TARGET_W / w)
img = img.resize((TARGET_W, target_h), Image.LANCZOS)

img.save(DST, optimize=True)
print(f"wrote {DST} ({img.size[0]}*{img.size[1]})")
