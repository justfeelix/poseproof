"""Export the trained lifter to ONNX for the browser.   (TODO: implement)

    python -m poseproof_analysis.lifting.export ../models/lifter.pt ../web/public/models/lifter.onnx

TODO
  1. Load the model, model.eval().
  2. torch.onnx.export(model, torch.zeros(1, 27, 17, 2), out, opset_version=17,
     input_names=["kp2d"], output_names=["kp3d"], dynamic_axes={"kp2d": {0: "batch"},
     "kp3d": {0: "batch"}}).
  3. Parity check: run the same random batch through PyTorch and onnxruntime; the max
     absolute difference must be below 1e-4 m. Print the file size.
  4. Write lifter.json next to it: window, fps, joint order (COCO-17), normalisation.

In the web app, web/src/lib/lifting/index.ts (temporalLifter) then loads the file with
onnxruntime-web, maps MediaPipe's 33 joints to COCO-17, runs one window per frame
(batched), and returns the 17 joints in the 33-joint layout (the rest NaN).
"""

from __future__ import annotations


def main(argv: list[str] | None = None) -> None:
    raise NotImplementedError


if __name__ == "__main__":
    main()
