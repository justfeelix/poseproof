"""Training examples for the temporal lifter.   (TODO: implement)

One example = a window of W consecutive 2D poses (input) and the 3D pose of the centre
frame (target). W = 27 frames at 30 fps covers about 0.9 s: enough to see where a squat is
going, short enough for the browser.

Conventions (must match the web app, see web/src/lib/lifting/index.ts):
  input   COCO-17 joints, image coordinates normalised so the image width maps to [-1, 1]
          and the aspect ratio is kept (VideoPose3D's normalize_screen_coordinates)
  target  17 joints in metres, camera coordinates, root-relative (hip midpoint = 0)
  rate    AIST++ is 60 fps: take every second frame so training matches the 30 fps app
"""

from __future__ import annotations

import numpy as np

WINDOW = 27


def normalize_screen(kp_px: np.ndarray, w: int, h: int) -> np.ndarray:
    """Pixels -> [-1, 1] across the width, aspect ratio kept. Ready to use."""
    out = kp_px[..., :2] / w * 2 - np.array([1, h / w])
    return out.astype(np.float32)


def make_windows(kp2d: np.ndarray, kp3d: np.ndarray, window: int = WINDOW) -> tuple[np.ndarray, np.ndarray]:
    """(N, 17, 2) and (N, 17, 3) -> X (M, window, 17, 2), Y (M, 17, 3).

    TODO
      1. pad both ends by window // 2 frames with edge replication, so every frame is a centre.
      2. X[i] = kp2d[i : i + window], Y[i] = kp3d[i] (the centre frame after padding).
      3. Make Y root-relative: subtract the hip midpoint (COCO 11 and 12) of each frame.
    """
    raise NotImplementedError


def augment(X: np.ndarray, rng: np.random.Generator, noise_px_norm: float = 0.01, drop: float = 0.05) -> np.ndarray:
    """Make clean training 2D look like real detector output.   (TODO: implement)

    AIST++ 2D keypoints are detector output already, but MediaPipe has its own error profile.
    TODO: Gaussian jitter of noise_px_norm on every joint, and with probability `drop` set a
    joint to the mean of its neighbours in time (simulates a missed detection). Also flip
    left/right with p = 0.5 (swap COCO left/right indices and negate x in input AND target).
    """
    raise NotImplementedError
