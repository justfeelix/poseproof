import numpy as np
import pytest

from poseproof_analysis.export_trial import to_trial


def test_converts_pixels_and_millimetres():
    kp2d = np.zeros((2, 33, 3))
    kp2d[:, :, 0], kp2d[:, :, 1], kp2d[:, :, 2] = 960, 540, 0.9
    kp3d = np.full((2, 33, 3), 100.0)
    kp2d[1] = np.nan  # no person in frame 1
    trial = to_trial(kp2d, kp3d, np.array([1000.0, 1033.3]), 1920, 1080, "squat_front", "t1")
    assert trial["schema"] == "poseproof.trial/1"
    assert trial["frames"][0]["poses"][0]["image"][0] == [0.5, 0.5, 0.0, 0.9]
    assert trial["frames"][0]["poses"][0]["world"][0] == [0.1, 0.1, 0.1, 0.9]
    assert trial["frames"][1] == {"t": 33.3, "poses": []}


def test_rejects_wrong_shape():
    with pytest.raises(ValueError):
        to_trial(np.zeros((1, 17, 3)), np.zeros((1, 17, 3)), np.zeros(1), 10, 10, "squat_front", "x")
