"""Temporal lifting network.   (TODO: implement)

VideoPose3D-style fully convolutional model over time (Pavllo et al., CVPR 2019,
https://arxiv.org/abs/1811.11742): 1D convolutions with growing dilation see a window of
2D poses and predict the 3D pose of the centre frame.

Target size for the browser: under 2 M parameters, so the ONNX file stays below ~8 MB and
one window runs in a few milliseconds with onnxruntime-web (wasm).

Architecture for W = 27 (kernel 3, dilations 1, 3, 9):
    input  (B, 27, 17, 2) -> reshape (B, 34, 27)
    expand Conv1d(34, C, k=3, d=1) + BatchNorm + ReLU + Dropout(0.25)      -> (B, C, 25)
    block  Conv1d(C, C, k=3, d=3) ... + residual (crop the skip to match)  -> (B, C, 19)
    block  Conv1d(C, C, k=3, d=9) ... + residual                          -> (B, C, 1)
    head   Conv1d(C, 51, k=1) -> reshape (B, 17, 3)
with C = 256 to start (about 1 M parameters).

Write it so the receptive field is computed from the dilations, and add a unit test that a
(2, 27, 17, 2) input gives a (2, 17, 3) output.
"""

from __future__ import annotations


def build_lifter(window: int = 27, joints: int = 17, channels: int = 256, dropout: float = 0.25):
    """Return a torch.nn.Module as described above. TODO: implement with torch.nn."""
    raise NotImplementedError
