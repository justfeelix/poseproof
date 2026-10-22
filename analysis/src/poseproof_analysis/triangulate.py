"""Two-view triangulation of 2D keypoints into metric 3D.  (TODO: implement)

The result is the reference ("pseudo ground truth") for everything else in this project:
3D keypoints in millimetres, in the coordinate frame of camera A.

Background: docs/concepts.md, section "Triangulation".
"""

from __future__ import annotations

import numpy as np


def projection_matrices(cam_a: dict, cam_b: dict, stereo: dict) -> tuple[np.ndarray, np.ndarray]:
    """P_a = K_a [I | 0], P_b = K_b [R | T]  (both 3x4).

    TODO: np.hstack / np.column_stack. T must be a column (3, 1).
    """
    raise NotImplementedError


def undistort(points_px: np.ndarray, K: np.ndarray, dist: np.ndarray) -> np.ndarray:
    """Remove lens distortion from pixel points (N, 2) -> (N, 2), still in pixels.

    TODO: cv2.undistortPoints(points.reshape(-1, 1, 2).astype(np.float64), K, dist, P=K).
    Passing P=K keeps the result in pixel units, which matches P = K[R|t] above.
    """
    raise NotImplementedError


def triangulate(kp_a: np.ndarray, kp_b: np.ndarray, cam_a: dict, cam_b: dict,
                stereo: dict, min_visibility: float = 0.5) -> np.ndarray:
    """(T, J, 3) 2D keypoints from both cameras (already synchronised) -> (T, J, 3) mm.

    TODO
    1. Flatten to (T*J, 2), undistort both.
    2. X_h = cv2.triangulatePoints(P_a, P_b, pts_a.T, pts_b.T)  -> (4, N) homogeneous.
    3. X = (X_h[:3] / X_h[3]).T, reshape to (T, J, 3).
    4. Set X to NaN where the visibility in either view is below `min_visibility`.
    """
    raise NotImplementedError


def reprojection_error(X: np.ndarray, kp2d: np.ndarray, K: np.ndarray, dist: np.ndarray,
                       R: np.ndarray | None = None, T: np.ndarray | None = None) -> np.ndarray:
    """Pixel distance between projected 3D points and detected 2D points, shape (T, J).

    TODO: rvec = cv2.Rodrigues(R)[0] (identity for camera A), cv2.projectPoints(X, rvec,
    T, K, dist). Large errors (> ~10 px) mean a bad detection in one view or a sync problem:
    mask those joints rather than averaging them in. Report the median per joint.
    """
    raise NotImplementedError
