"""Joint definitions for the three keypoint formats used in this project.

- MediaPipe Pose Landmarker: 33 landmarks
- COCO: 17 keypoints (AIST++ annotations, VideoPose3D input)
- Human3.6M (H36M): 17 joints (VideoPose3D / MotionBERT output)

The formats do not describe the same anatomical points. COCO and MediaPipe keypoints are
learned from image annotations (roughly "where a person would click"), H36M joints are joint
centres from a marker-based motion-capture skeleton. The hips differ the most. Only compare
methods on joints that exist in every format (LIMB12 below) and say so in the results.
"""

from __future__ import annotations

import numpy as np

MEDIAPIPE33 = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer", "right_eye_inner", "right_eye",
    "right_eye_outer", "left_ear", "right_ear", "mouth_left", "mouth_right",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist",
    "right_wrist", "left_pinky", "right_pinky", "left_index", "right_index", "left_thumb",
    "right_thumb", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle",
    "right_ankle", "left_heel", "right_heel", "left_foot_index", "right_foot_index",
]

COCO17 = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist",
    "right_wrist", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle",
    "right_ankle",
]

# H36M order as used by VideoPose3D and MotionBERT.
# "pelvis" is the root; "spine", "thorax", "neck", "head" have no COCO equivalent.
H36M17 = [
    "pelvis", "right_hip", "right_knee", "right_ankle", "left_hip", "left_knee",
    "left_ankle", "spine", "thorax", "neck", "head", "left_shoulder", "left_elbow",
    "left_wrist", "right_shoulder", "right_elbow", "right_wrist",
]

FORMATS = {"mediapipe33": MEDIAPIPE33, "coco17": COCO17, "h36m17": H36M17}

# The 12 limb joints that exist in all three formats. Use these for every comparison.
LIMB12 = [
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist",
    "right_wrist", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle",
    "right_ankle",
]

# Body segments as pairs of joint names. "Length" = Euclidean distance between the two.
SEGMENTS = {
    "upper_arm_l": ("left_shoulder", "left_elbow"),
    "upper_arm_r": ("right_shoulder", "right_elbow"),
    "forearm_l": ("left_elbow", "left_wrist"),
    "forearm_r": ("right_elbow", "right_wrist"),
    "thigh_l": ("left_hip", "left_knee"),
    "thigh_r": ("right_hip", "right_knee"),
    "shank_l": ("left_knee", "left_ankle"),
    "shank_r": ("right_knee", "right_ankle"),
    "shoulder_width": ("left_shoulder", "right_shoulder"),
    "hip_width": ("left_hip", "right_hip"),
    "torso_l": ("left_shoulder", "left_hip"),
    "torso_r": ("right_shoulder", "right_hip"),
}


def index_of(fmt: str, names: list[str]) -> list[int]:
    """Indices of `names` in keypoint format `fmt` (raises KeyError for unknown names)."""
    joints = FORMATS[fmt]
    missing = [n for n in names if n not in joints]
    if missing:
        raise KeyError(f"{missing} not in format {fmt}")
    return [joints.index(n) for n in names]


def select(kp: np.ndarray, fmt: str, names: list[str] = LIMB12) -> np.ndarray:
    """Pick joints by name. kp has shape (..., J, D); returns (..., len(names), D)."""
    return kp[..., index_of(fmt, names), :]


def mid_hip(kp: np.ndarray, fmt: str) -> np.ndarray:
    """Midpoint of left and right hip, shape (..., D). Used as the common root."""
    left, right = index_of(fmt, ["left_hip", "right_hip"])
    return 0.5 * (kp[..., left, :] + kp[..., right, :])


def mediapipe_to_coco17(kp: np.ndarray) -> np.ndarray:
    """MediaPipe 33 -> COCO 17 (pure re-indexing, same point definitions by name)."""
    return select(kp, "mediapipe33", COCO17)


def coco17_to_h36m17(kp: np.ndarray) -> np.ndarray:
    """COCO 17 -> H36M 17, the usual approximation (as in MotionBERT's wild-video code).

    pelvis = mid-hip, thorax = mid-shoulder, spine = midpoint of pelvis and thorax,
    neck = nose, head = mid-eyes. These synthetic joints are approximations: never report
    accuracy on them.
    """
    c = {name: kp[..., i, :] for i, name in enumerate(COCO17)}
    pelvis = 0.5 * (c["left_hip"] + c["right_hip"])
    thorax = 0.5 * (c["left_shoulder"] + c["right_shoulder"])
    out = {
        "pelvis": pelvis,
        "spine": 0.5 * (pelvis + thorax),
        "thorax": thorax,
        "neck": c["nose"],
        "head": 0.5 * (c["left_eye"] + c["right_eye"]),
    }
    for name in H36M17:
        if name not in out:
            out[name] = c[name]
    return np.stack([out[name] for name in H36M17], axis=-2)
