"""Create a printable checkerboard PDF at exact physical size.

Default: 10 x 7 squares of 25 mm (= 9 x 6 inner corners) on landscape A4.
Print at 100 % / "actual size", glue it flat onto cardboard, then measure one row of
squares with a ruler and use the measured square size for calibration.

    python tools/make_checkerboard.py --out docs/checkerboard_A4_9x6_25mm.pdf
"""

from __future__ import annotations

import argparse

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Rectangle  # noqa: E402

MM_PER_INCH = 25.4


def make(out: str, cols: int = 10, rows: int = 7, square_mm: float = 25.0,
         page_w_mm: float = 297.0, page_h_mm: float = 210.0) -> None:
    fig = plt.figure(figsize=(page_w_mm / MM_PER_INCH, page_h_mm / MM_PER_INCH))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, page_w_mm)
    ax.set_ylim(0, page_h_mm)
    ax.set_aspect("equal")
    ax.axis("off")

    board_w, board_h = cols * square_mm, rows * square_mm
    x0 = (page_w_mm - board_w) / 2
    y0 = (page_h_mm - board_h) / 2 + 6
    for r in range(rows):
        for c in range(cols):
            if (r + c) % 2 == 0:
                ax.add_patch(Rectangle((x0 + c * square_mm, y0 + r * square_mm),
                                       square_mm, square_mm, color="black", lw=0))

    # 100 mm reference line to check the print scale.
    ax.plot([x0, x0 + 100], [y0 - 8, y0 - 8], color="black", lw=1)
    ax.text(x0, y0 - 14,
            f"100 mm check line | {cols}x{rows} squares, {cols - 1}x{rows - 1} inner corners, "
            f"{square_mm:g} mm | print at 100 %",
            fontsize=8, va="top")
    fig.savefig(out)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="docs/checkerboard_A4_9x6_25mm.pdf")
    p.add_argument("--cols", type=int, default=10)
    p.add_argument("--rows", type=int, default=7)
    p.add_argument("--square-mm", type=float, default=25.0)
    a = p.parse_args()
    make(a.out, a.cols, a.rows, a.square_mm)
