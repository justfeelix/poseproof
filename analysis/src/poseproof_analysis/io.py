"""Small helpers for the one file format used between pipeline steps.

Every step reads and writes `.npz` files with these keys (missing keys are allowed):

    kp2d        (T, J, 3)  pixel x, pixel y, visibility/confidence
    kp3d        (T, J, 3)  3D points in millimetres
    t_ms        (T,)       frame timestamps in milliseconds
    fmt         str        "mediapipe33", "coco17" or "h36m17"
    source      str        free text, e.g. "mediapipe-heavy cam=A trial=squat"

Keep raw videos out of git (see .gitignore); the npz files are small enough to keep in
data/processed if you want to share results without sharing video of yourself.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np


def save_keypoints(path: str | Path, **arrays) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(path, **arrays)
    return path


def load_keypoints(path: str | Path) -> dict:
    with np.load(path, allow_pickle=False) as data:
        out = {k: data[k] for k in data.files}
    for key in ("fmt", "source"):
        if key in out:
            out[key] = str(out[key])
    return out
