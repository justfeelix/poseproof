"""Temporal 2D-to-3D lifter: data, model, training, ONNX export. Plan: docs/lifting.md.

aistpp   load AIST++ 2D/3D keypoints and cameras (training and test data)
windows  cut sequences into fixed-length 2D windows with the 3D pose of the centre frame
model    dilated temporal convolutions (VideoPose3D-style), small enough for the browser
train    training loop with MPJPE loss, bone-length term and 2D noise augmentation
export   ONNX export and a parity check against PyTorch
"""
