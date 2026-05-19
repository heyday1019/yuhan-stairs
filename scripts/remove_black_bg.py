"""Remove near-black background from a PNG by mapping low-luminance pixels to transparent.

Usage:
    python scripts/remove_black_bg.py <input.png> <output.png> [low=15] [high=60]

The alpha of each pixel is multiplied by smoothstep(low, high, max(r,g,b)).
Pixels darker than `low` become fully transparent; pixels brighter than `high`
keep their original alpha. The neon glow fades smoothly to transparency.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image


def remove_black_bg(src: Path, dst: Path, low: int = 15, high: int = 60) -> None:
    img = np.array(Image.open(src).convert("RGBA"))
    rgb = img[:, :, :3].astype(np.int32)
    m = rgb.max(axis=2)
    t = np.clip((m - low) / max(1, (high - low)), 0.0, 1.0)
    # smoothstep for softer roll-off
    s = t * t * (3.0 - 2.0 * t)
    new_alpha = (img[:, :, 3].astype(np.float32) * s).clip(0, 255).astype(np.uint8)
    img[:, :, 3] = new_alpha
    dst.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(img).save(dst, optimize=True)
    print(f"wrote {dst} ({img.shape[1]}x{img.shape[0]}, low={low}, high={high})")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    low = int(sys.argv[3]) if len(sys.argv) > 3 else 15
    high = int(sys.argv[4]) if len(sys.argv) > 4 else 60
    remove_black_bg(src, dst, low, high)
