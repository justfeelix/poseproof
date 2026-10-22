import numpy as np

from poseproof_analysis import skeleton as sk


def test_format_sizes():
    assert len(sk.MEDIAPIPE33) == 33
    assert len(sk.COCO17) == 17
    assert len(sk.H36M17) == 17


def test_limb12_exists_in_all_formats():
    for fmt in sk.FORMATS:
        assert len(sk.index_of(fmt, sk.LIMB12)) == 12


def test_mediapipe_to_coco_keeps_names():
    kp = np.arange(33 * 3, dtype=float).reshape(33, 3)
    coco = sk.mediapipe_to_coco17(kp)
    for i, name in enumerate(sk.COCO17):
        assert np.allclose(coco[i], kp[sk.MEDIAPIPE33.index(name)])


def test_coco_to_h36m_synthetic_joints():
    kp = np.zeros((2, 17, 3))
    kp[:, sk.COCO17.index("left_hip")] = [10, 0, 0]
    kp[:, sk.COCO17.index("right_hip")] = [-10, 0, 0]
    kp[:, sk.COCO17.index("left_shoulder")] = [20, 50, 0]
    kp[:, sk.COCO17.index("right_shoulder")] = [-20, 50, 0]
    h = sk.coco17_to_h36m17(kp)
    assert h.shape == (2, 17, 3)
    assert np.allclose(h[:, sk.H36M17.index("pelvis")], [0, 0, 0])
    assert np.allclose(h[:, sk.H36M17.index("thorax")], [0, 50, 0])
    assert np.allclose(h[:, sk.H36M17.index("spine")], [0, 25, 0])
    assert np.allclose(h[:, sk.H36M17.index("left_hip")], [10, 0, 0])


def test_mid_hip():
    kp = np.zeros((17, 3))
    kp[sk.COCO17.index("left_hip")] = [2, 4, 6]
    assert np.allclose(sk.mid_hip(kp, "coco17"), [1, 2, 3])
