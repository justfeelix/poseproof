"""Synchronise two videos with a clap.  (TODO: implement)

At the start of every trial, clap once with straight arms in front of the body. In both
videos, the clap is the frame where the two wrists are closest together. The difference
between those frame indices is the offset between the cameras.

Record both cameras at the same frame rate (e.g. 30 fps). If they differ, resample one
series to the other's timestamps with np.interp per coordinate instead of using offsets.
"""

from __future__ import annotations

import numpy as np


def clap_frame(kp2d: np.ndarray, fmt: str, first_n_frames: int = 300) -> int:
    """Index of the frame with minimal wrist distance in the first `first_n_frames` frames.

    TODO: use poseproof_analysis.skeleton.index_of(fmt, ["left_wrist", "right_wrist"]), divide the
    wrist distance by the shoulder width so the value does not depend on how far the person
    stands from the camera, ignore NaN frames (np.nanargmin). Plot the curve once: it should
    have one sharp minimum.
    """
    raise NotImplementedError


def align(a: np.ndarray, b: np.ndarray, frame_a: int, frame_b: int):
    """Cut both (T, J, 3) arrays so that index 0 is the clap in both. Return (a, b) with equal length.

    TODO: shift = frame_a - frame_b; drop the leading frames of the earlier one; truncate
    both to the shorter length.
    """
    raise NotImplementedError
