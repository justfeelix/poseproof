"""Load AIST++ annotations as an evaluation set with 3D ground truth.  (TODO: implement)

AIST++ (https://google.github.io/aistplusplus_dataset/) provides, per sequence:
- keypoints3d/<seq>.pkl : "keypoints3d" and "keypoints3d_optim", (N, 17, 3), COCO order,
  world coordinates, reconstructed from 9 calibrated cameras (so: multi-view pseudo ground
  truth, not marker mocap; say that in the README).
- keypoints2d/<seq>.pkl : "keypoints2d", (9, N, 17, 3) = per view x, y, confidence
  (detector output, i.e. realistic noisy 2D input for a lifter).
- cameras/mapping.txt + cameras/setting<k>.json : per view name, size, matrix (K),
  rotation (Rodrigues vector), translation, distortions.
Frames are at exactly 60 fps. Sequences in ignore_list.txt have bad reconstructions: skip.
Sequence names look like gBR_sBM_cAll_d04_mBR0_ch01; "d04" is the dancer id.

Reference loader code: https://github.com/google/aistplusplus_api (aist_plusplus/loader.py).
"""

from __future__ import annotations

import numpy as np


def dancer_id(seq_name: str) -> str:
    """'gBR_sBM_cAll_d04_mBR0_ch01' -> 'd04'. Split train/test BY DANCER to avoid leakage."""
    return next(part for part in seq_name.split("_") if part.startswith("d") and part[1:].isdigit())


def load_cameras(cameras_dir: str, seq_name: str) -> list[dict]:
    """List of 9 dicts {name, K, dist, R (3x3), t (3,), size} for the sequence's setting.

    TODO: read mapping.txt (seq -> setting name), load that JSON, convert "rotation" with
    cv2.Rodrigues to a 3x3 matrix.
    """
    raise NotImplementedError


def load_keypoints3d(path: str, optimised: bool = True) -> np.ndarray:
    """(N, 17, 3) world coordinates. TODO: pickle.load, pick 'keypoints3d_optim' or 'keypoints3d'.

    FIRST CHECK THE UNIT: compute the median thigh length (left_hip -> left_knee). About 40
    means centimetres, about 0.4 metres, about 400 millimetres. Convert to mm.
    """
    raise NotImplementedError


def load_keypoints2d(path: str, view: int) -> np.ndarray:
    """(N, 17, 3) pixel x, y, confidence for one camera view (0..8)."""
    raise NotImplementedError


def world_to_camera(X_world: np.ndarray, R: np.ndarray, t: np.ndarray) -> np.ndarray:
    """X_cam = R @ X_world + t for every point; works on (..., 3). Ready to use."""
    return X_world @ np.asarray(R).T + np.asarray(t).reshape(3)


def check_projection(X_cam: np.ndarray, kp2d: np.ndarray, K: np.ndarray, dist: np.ndarray) -> float:
    """Median pixel distance between projected 3D ground truth and the 2D keypoints.

    TODO: cv2.projectPoints with zero rotation/translation (points are already in camera
    coordinates). Expect a few pixels. If it is hundreds of pixels, units or the R/t
    convention are wrong; fix that before any MPJPE number means anything.
    """
    raise NotImplementedError
