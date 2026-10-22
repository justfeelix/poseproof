import numpy as np
import pytest

from poseproof_analysis import metrics


def random_rotation(rng):
    q, _ = np.linalg.qr(rng.normal(size=(3, 3)))
    if np.linalg.det(q) < 0:
        q[:, 0] *= -1
    return q


@pytest.fixture
def pose():
    rng = np.random.default_rng(0)
    return rng.normal(scale=300.0, size=(5, 12, 3))  # 5 frames, 12 joints, mm


def test_mpjpe_zero_for_identical(pose):
    assert metrics.mpjpe(pose, pose) == pytest.approx(0.0)


def test_mpjpe_known_offset(pose):
    shifted = pose + np.array([30.0, 40.0, 0.0])  # every joint 50 mm away
    assert metrics.mpjpe(shifted, pose) == pytest.approx(50.0)


def test_root_alignment_removes_translation(pose):
    shifted = pose + np.array([100.0, -20.0, 7.0])
    assert metrics.mpjpe(shifted, pose, pred_root=0, gt_root=0) == pytest.approx(0.0, abs=1e-9)


def test_n_mpjpe_removes_scale(pose):
    scaled = 1.15 * pose
    assert metrics.mpjpe(scaled, pose, 0, 0) > 1.0
    assert metrics.n_mpjpe(scaled, pose, 0, 0) == pytest.approx(0.0, abs=1e-6)


def test_pa_mpjpe_removes_similarity_transform(pose):
    rng = np.random.default_rng(1)
    r = random_rotation(rng)
    transformed = 0.8 * pose @ r + np.array([500.0, 0.0, -200.0])
    assert metrics.mpjpe(transformed, pose) > 10.0
    assert metrics.pa_mpjpe(transformed, pose) == pytest.approx(0.0, abs=1e-6)


def test_pa_mpjpe_does_not_allow_reflection(pose):
    mirrored = pose * np.array([-1.0, 1.0, 1.0])
    assert metrics.pa_mpjpe(mirrored, pose) > 1.0


def test_pa_mpjpe_le_mpjpe_on_noise(pose):
    rng = np.random.default_rng(2)
    noisy = pose + rng.normal(scale=20.0, size=pose.shape)
    assert metrics.pa_mpjpe(noisy, pose) <= metrics.mpjpe(noisy, pose, 0, 0)


def test_single_frame_input():
    a = np.zeros((4, 3))
    b = np.ones((4, 3))
    assert metrics.mpjpe(a, b) == pytest.approx(np.sqrt(3))


def test_bone_lengths_and_summary():
    names = ["a", "b"]
    kp = np.zeros((3, 2, 3))
    kp[:, 1, 0] = [100.0, 102.0, 98.0]
    lengths = metrics.bone_lengths(kp, names, {"ab": ("a", "b"), "ax": ("a", "x")})
    assert set(lengths) == {"ab"}  # segments with unknown joints are skipped
    s = metrics.robust_summary(lengths["ab"])
    assert s["median"] == pytest.approx(100.0)
    assert s["n"] == 3
