import numpy as np

from poseproof_analysis.lifting.windows import normalize_screen


def test_normalize_screen_maps_width_to_unit_range_and_keeps_aspect():
    w, h = 1920, 1080
    kp = np.array([[0, 0], [w, h], [w / 2, h / 2]], dtype=float)
    out = normalize_screen(kp, w, h)
    np.testing.assert_allclose(out[0], [-1, -h / w])
    np.testing.assert_allclose(out[1], [1, h / w])
    np.testing.assert_allclose(out[2], [0, 0], atol=1e-7)
