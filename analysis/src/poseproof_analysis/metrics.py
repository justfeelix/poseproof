"""Accuracy metrics for 3D pose: MPJPE, N-MPJPE, PA-MPJPE, bone-length statistics.

All functions take arrays of shape (T, J, 3) (frames, joints, xyz) or (J, 3) and return
values in the same unit as the input. Convert everything to millimetres before calling, so
the numbers are comparable with the literature.

Conventions
-----------
- MPJPE: mean Euclidean distance per joint, after subtracting the root joint from both
  prediction and ground truth ("root-aligned"). Sensitive to scale and global rotation.
- N-MPJPE: like MPJPE, but the prediction is first scaled by the single factor that best
  fits the ground truth (per frame). Removes scale errors only.
- PA-MPJPE: like MPJPE after a per-frame similarity transform (rotation, uniform scale,
  translation) that best aligns prediction to ground truth (Procrustes analysis). Measures
  the error in body *shape/pose* alone.
"""

from __future__ import annotations

import numpy as np


def _as_frames(x: np.ndarray) -> np.ndarray:
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 2:
        x = x[None]
    if x.ndim != 3 or x.shape[-1] != 3:
        raise ValueError(f"expected shape (T, J, 3) or (J, 3), got {x.shape}")
    return x


def root_align(x: np.ndarray, root: np.ndarray | int | None) -> np.ndarray:
    """Subtract a root per frame. `root` is a joint index or an array of shape (T, 3)."""
    x = _as_frames(x)
    if root is None:
        return x
    if isinstance(root, (int, np.integer)):
        return x - x[:, root : root + 1, :]
    root = np.asarray(root, dtype=np.float64).reshape(x.shape[0], 1, 3)
    return x - root


def per_joint_error(pred: np.ndarray, gt: np.ndarray) -> np.ndarray:
    """Euclidean error per frame and joint, shape (T, J). No alignment is applied."""
    pred, gt = _as_frames(pred), _as_frames(gt)
    if pred.shape != gt.shape:
        raise ValueError(f"shape mismatch {pred.shape} vs {gt.shape}")
    return np.linalg.norm(pred - gt, axis=-1)


def mpjpe(pred: np.ndarray, gt: np.ndarray, pred_root=None, gt_root=None) -> float:
    """Mean per-joint position error. Pass roots (index or (T, 3) array) to root-align."""
    p = root_align(pred, pred_root)
    g = root_align(gt, gt_root)
    return float(np.nanmean(per_joint_error(p, g)))


def scale_align(pred: np.ndarray, gt: np.ndarray) -> np.ndarray:
    """Scale each predicted frame by the least-squares factor s = <p, g> / <p, p>.

    Both inputs should already be root-aligned.
    """
    pred, gt = _as_frames(pred), _as_frames(gt)
    num = np.sum(pred * gt, axis=(1, 2), keepdims=True)
    den = np.sum(pred * pred, axis=(1, 2), keepdims=True)
    return pred * (num / den)


def n_mpjpe(pred: np.ndarray, gt: np.ndarray, pred_root=None, gt_root=None) -> float:
    """Scale-normalised MPJPE (root-align first, then optimal per-frame scale)."""
    p = root_align(pred, pred_root)
    g = root_align(gt, gt_root)
    return float(np.nanmean(per_joint_error(scale_align(p, g), g)))


def procrustes_align(pred: np.ndarray, gt: np.ndarray) -> np.ndarray:
    """Per-frame similarity transform (R, s, t) that maps pred onto gt, applied to pred.

    Solves min ||s * pred @ R + t - gt||^2 with R a proper rotation (no reflection).
    Same formulation as the p_mpjpe function in VideoPose3D.
    """
    pred, gt = _as_frames(pred), _as_frames(gt)
    mu_g = gt.mean(axis=1, keepdims=True)
    mu_p = pred.mean(axis=1, keepdims=True)
    g0 = gt - mu_g
    p0 = pred - mu_p
    norm_g = np.sqrt(np.sum(g0**2, axis=(1, 2), keepdims=True))
    norm_p = np.sqrt(np.sum(p0**2, axis=(1, 2), keepdims=True))
    g0 = g0 / norm_g
    p0 = p0 / norm_p

    h = np.matmul(np.transpose(g0, (0, 2, 1)), p0)  # (T, 3, 3)
    u, s, vt = np.linalg.svd(h)
    v = np.transpose(vt, (0, 2, 1))
    r = np.matmul(v, np.transpose(u, (0, 2, 1)))

    # Avoid reflections: flip the last singular vector where det(R) < 0.
    sign = np.sign(np.linalg.det(r))[:, None]  # (T, 1)
    v[:, :, -1] *= sign
    s[:, -1] *= sign[:, 0]
    r = np.matmul(v, np.transpose(u, (0, 2, 1)))

    trace = np.sum(s, axis=1, keepdims=True)[:, :, None]  # (T, 1, 1)
    scale = trace * norm_g / norm_p
    t = mu_g - scale * np.matmul(mu_p, r)
    return scale * np.matmul(pred, r) + t


def pa_mpjpe(pred: np.ndarray, gt: np.ndarray) -> float:
    """Procrustes-aligned MPJPE (no root alignment needed, the transform includes t)."""
    aligned = procrustes_align(pred, gt)
    return float(np.nanmean(per_joint_error(aligned, gt)))


def bone_lengths(kp: np.ndarray, joint_names: list[str], segments: dict) -> dict:
    """Length of every segment per frame. Returns {segment_name: array of shape (T,)}."""
    kp = _as_frames(kp)
    idx = {name: i for i, name in enumerate(joint_names)}
    out = {}
    for seg, (a, b) in segments.items():
        if a in idx and b in idx:
            out[seg] = np.linalg.norm(kp[:, idx[a]] - kp[:, idx[b]], axis=-1)
    return out


def robust_summary(values: np.ndarray) -> dict:
    """Median, interquartile range and coefficient of variation (std/mean) of a series."""
    v = np.asarray(values, dtype=np.float64)
    v = v[np.isfinite(v)]
    if v.size == 0:
        return {"n": 0, "median": np.nan, "iqr": np.nan, "cv": np.nan}
    q1, med, q3 = np.percentile(v, [25, 50, 75])
    return {"n": int(v.size), "median": float(med), "iqr": float(q3 - q1),
            "cv": float(np.std(v) / np.mean(v))}
