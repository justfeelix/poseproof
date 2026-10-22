# 2D-to-3D lifting

**Goal.** Show, compare and evaluate 3D body poses lifted from a single camera, inside the
same app that judges the test. The 3D view already exists (Review, 3D or Both); this
document plans the second lifter and its evaluation.

## Status

| Part | State |
|---|---|
| Interactive 3D viewer (orbit, zoom, front/side/top, hip path, synced with the timeline) | done |
| Lifter interface (`web/src/lib/lifting/index.ts`) | done |
| Lifter 1: MediaPipe 3D (world landmarks from the pose model) | done |
| Lifter 2: temporal lifting network, trained here, run in the browser | planned |
| Comparison in the viewer: second lifter as a ghost skeleton, per-joint difference | planned |
| Ground truth for own recordings: two-camera triangulation | planned |
| Numbers: MPJPE and PA-MPJPE on AIST++ test dancers and on own recordings | planned |

## Why a second lifter

MediaPipe's 3D is a black box trained on data we cannot inspect. A small model of our own
shows the parts the role asks for: preparing a dataset, training a lifting network,
reporting MPJPE and PA-MPJPE, and deploying it. With both in the viewer, the difference is
visible frame by frame, not only as one number.

## Plan

**Data.** AIST++ (Google; 3D keypoints reconstructed from 9 calibrated cameras, 2D
detections per view, COCO-17, 60 fps; free download of the annotations). Split by dancer
so no person appears in train and test. Fit3D (fitness exercises, closer to squats) and
Human3.6M need a licence request; use them only if access arrives in time.

**Model.** VideoPose3D-style dilated temporal convolutions (Pavllo et al. 2019): a window of
27 frames of 2D COCO-17 keypoints in, the 3D pose of the centre frame out, root-relative,
in metres. About 1 M parameters, so it runs in the browser.

**Training.** MPJPE loss plus a bone-length consistency term; 2D noise, dropped joints and
left/right flips as augmentation so MediaPipe's 2D does not look foreign to the model.

**Evaluation.**
1. AIST++ test dancers: MPJPE and PA-MPJPE in mm, per joint and per dance genre.
2. Own squats recorded with two calibrated cameras: triangulated 3D as reference, then
   MPJPE of MediaPipe 3D and of the temporal lifter against it, and knee-bend error at the
   bottom of each rep (the value the depth check depends on).
3. Visual: both lifters overlaid in the 3D viewer on the same trial.

**Deployment.** Export to ONNX (opset 17), run with onnxruntime-web in a worker, one batch
per trial in Review; live use later if it is fast enough.

## Code map

```
analysis/src/poseproof_analysis/lifting/
  aistpp.py    AIST++ loader (cameras, 2D, 3D, unit check, projection check)
  windows.py   27-frame windows, normalisation, augmentation
  model.py     temporal convolution network
  train.py     training and evaluation by dancer split
  export.py    ONNX export with a parity check
analysis/src/poseproof_analysis/metrics.py   MPJPE, N-MPJPE, PA-MPJPE (done, tested)
web/src/lib/lifting/index.ts                 Lifter interface; temporalLifter to fill in
web/src/lib/viz/scene3d.ts                   3D viewer; ghost skeleton for comparisons
```

## Risks

- **Domain gap.** AIST++ is dance, filmed from fixed studio cameras; squats in a gym look
  different. Mitigation: augmentation, and the own two-camera recordings as a second test.
- **Joint definitions.** COCO "hips" are not anatomical hip centres; MediaPipe and AIST++
  place them differently. Compare root-relative and with PA-MPJPE, and report both.
- **Scale.** A single camera cannot know absolute size; lifters learn an average body.
  This is why PA-MPJPE (scale removed) is reported next to MPJPE.
