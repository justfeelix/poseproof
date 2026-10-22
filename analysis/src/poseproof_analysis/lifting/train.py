"""Train and evaluate the temporal lifter on AIST++.   (TODO: implement)

    python -m poseproof_analysis.lifting.train --aist ../data/aistpp --out ../models/lifter.pt

Steps
  1. Split sequences BY DANCER (aistpp.dancer_id): e.g. d01-d25 train, d26-d30 test.
     Never let one dancer appear in both, or the test numbers are optimistic.
  2. For every sequence and a subset of the 9 views: project 3D to that camera
     (aistpp.world_to_camera), take that view's 2D, subsample to 30 fps, make windows.
  3. Loss = MPJPE (metrics.mpjpe as a torch expression) + 0.1 * bone-length consistency
     (left and right thigh and shank lengths should match the target's).
  4. Adam, lr 1e-3 with decay 0.95 per epoch, batch 1024, about 30 epochs; keep the best
     epoch by validation MPJPE (hold out 2 training dancers for validation).
  5. Report on the test dancers: MPJPE and PA-MPJPE in mm (metrics.py), per joint and per
     dance genre, and against MediaPipe's own 3D on the same frames if you run MediaPipe on
     the AIST++ videos (optional, needs the videos).
  6. Save the model and a small JSON with the input normalisation and joint order.

Write results to ../results/lifting.md; they go into the README.
"""

from __future__ import annotations


def main(argv: list[str] | None = None) -> None:
    raise NotImplementedError


if __name__ == "__main__":
    main()
