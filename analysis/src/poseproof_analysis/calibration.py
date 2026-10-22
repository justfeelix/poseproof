"""Camera calibration with a printed checkerboard (OpenCV).  (TODO: implement)

Two stages:
1. Intrinsics per camera: focal lengths, principal point, lens distortion (K, dist).
2. Stereo extrinsics: rotation R and translation T from camera A to camera B,
   so that a point X_A in camera-A coordinates is X_B = R @ X_A + T in camera B.

Units: T comes out in the unit you give the square size in. Use millimetres everywhere.

Docs: https://docs.opencv.org/4.x/dc/dbb/tutorial_py_calibration.html
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

PATTERN = (9, 6)  # inner corners (columns, rows) of docs/checkerboard_A4_9x6_25mm.pdf


def sample_frames(video_path: str | Path, every_n: int = 10):
    """Yield (frame_index, BGR frame) for every n-th frame of a video.

    TODO: cv2.VideoCapture, loop over cap.read(), yield when index % every_n == 0.
    """
    raise NotImplementedError


def object_points(pattern: tuple[int, int] = PATTERN, square_mm: float = 25.0) -> np.ndarray:
    """3D corner positions on the board plane (z = 0), shape (cols*rows, 3), float32.

    TODO: np.mgrid over the pattern, multiply by the MEASURED square size (measure the
    printout with a ruler, printers scale).
    """
    raise NotImplementedError


def find_corners(gray: np.ndarray, pattern: tuple[int, int] = PATTERN):
    """Detect checkerboard corners with sub-pixel accuracy. Return (N, 1, 2) float32 or None.

    TODO: cv2.findChessboardCornersSB(gray, pattern) is the robust choice (sub-pixel
    built in). Alternative: cv2.findChessboardCorners + cv2.cornerSubPix(gray, corners,
    (11, 11), (-1, -1), criteria). Draw the result with cv2.drawChessboardCorners on a few
    frames and LOOK at them: corner order must start at the same board corner in both
    cameras (a 9x6 board is not 180-degree symmetric, which is why it was chosen).
    """
    raise NotImplementedError


def calibrate_intrinsics(corners: list[np.ndarray], image_size: tuple[int, int],
                         square_mm: float) -> dict:
    """Return {"K": 3x3, "dist": (k1,k2,p1,p2,k3), "rms": float, "image_size": (w, h)}.

    TODO: cv2.calibrateCamera([object_points]*len(corners), corners, image_size, None, None).
    rms is the mean reprojection error in pixels: below ~0.5 px is good, above 1 px means
    blurry frames, a bent board, or too little coverage of the image corners.
    """
    raise NotImplementedError


def stereo_calibrate(corners_a: list[np.ndarray], corners_b: list[np.ndarray],
                     cam_a: dict, cam_b: dict, square_mm: float) -> dict:
    """Return {"R": 3x3, "T": (3,), "rms": float} mapping camera A -> camera B.

    Only pass frame pairs where BOTH cameras found the board at the SAME moment (hold the
    board still for a second at each position, then small sync errors do not matter).

    TODO: cv2.stereoCalibrate(objpoints, corners_a, corners_b, K_a, dist_a, K_b, dist_b,
    image_size, flags=cv2.CALIB_FIX_INTRINSIC). Sanity check: np.linalg.norm(T) must match
    the distance between the two lenses that you measured with a tape (within a few cm).
    """
    raise NotImplementedError


def save_json(path: str | Path, data: dict) -> None:
    """Write calibration results; numpy arrays become lists."""
    def conv(v):
        return v.tolist() if isinstance(v, np.ndarray) else v
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps({k: conv(v) for k, v in data.items()}, indent=2))


def load_json(path: str | Path) -> dict:
    data = json.loads(Path(path).read_text())
    return {k: (np.asarray(v) if isinstance(v, list) else v) for k, v in data.items()}
