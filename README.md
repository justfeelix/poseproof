# PoseProof

**Is this camera-based fitness test valid?** PoseProof watches a squat test through an
ordinary webcam and decides whether the result can be trusted. If it can't, it tells the
user what to fix: step back, turn to face the camera, keep the heels down, go lower, slow
down.

It runs entirely in the browser with MediaPipe Pose. No video leaves the device; only body
landmarks are kept, and only if you download them.

> Status: work in progress. Recording, review, the 3D view, all nine checks and the
> evaluation tooling are done. The checks are unit-tested on synthetic trials with injected
> faults; they have not been evaluated on real recordings yet, and every threshold is a
> starting guess. The trained lifter and the evaluation on real recordings are being built.
> Results below are filled in once measured.

**Live:** [poseproof.vercel.app](https://poseproof.vercel.app/), demo trials at
[/#review](https://poseproof.vercel.app/#review)

## The app

- **Record:** live skeleton over the camera, knee-bend readout, setup lights that say what
  to fix before you start, optional live 3D. Press R (or the button) and walk into position:
  a start delay of up to 15 s counts down with beeps, and a double beep marks the end.
- **Review:** every recording is kept in your browser. 2D, 3D or both on one clock; a
  timeline with knee bend, hip height and red bands where a check failed; click a failed
  check to jump there; frame stepping and keyboard shortcuts (press ?).
- **3D:** the skeleton on a lifting platform with a 50 cm grid; drag to orbit, scroll to
  zoom, front, side and top views, hip path. The 3D comes from a lifter: MediaPipe's own 3D
  today, a trained temporal lifter next ([docs/lifting.md](docs/lifting.md)).

## Why

Self-service fitness assessments (a body scan or a squat test at a kiosk, without a
trainer next to you) only work if bad trials are caught. Two kinds of problems matter:

- **The person did the test wrong:** partly out of the picture, turned the wrong way, too
  shallow, heels up, too fast, no calm start.
- **The tracker failed silently:** a hidden leg is guessed, a second person walks in, a
  knee jumps between frames. Markerless trackers have a tail of large errors from exactly
  these failures (Nakano et al. 2020), and depth cameras struggle with body parts hidden
  from the camera (Jo et al. 2022).

A score computed from such a trial is worse than no score, because it ends up in a
training plan.

## What it checks

| Check | Fails when | Signal |
|---|---|---|
| framing | head, hands or feet leave the image | image coordinates of the extremities |
| one_person | someone else is in the picture | number of detected persons |
| orientation | turned the wrong way for this test | angle of shoulder and hip line to the image plane |
| visibility | measured joints are hidden | per-joint visibility over time |
| stability | the tracker glitches | bone-length variation, frame-to-frame jumps |
| calm_start | no standing baseline | hip height variation in the first 1.5 s |
| depth | squat too shallow | 3D knee flexion |
| heels | heels lift | heel height relative to the toes vs baseline |
| tempo | reps too fast | descent time per rep from a hysteresis rep detector |

The checks are grouped under three judges, as on a lifting platform: setup (the first four),
tracking (stability, calm start) and movement (depth, heels, tempo). Each judge shows a
white light for good or a red light for no, and the trial counts only with three white
lights.

Every check reduces a trial to one measured number and compares it with a threshold in
[`web/src/lib/checks/config.ts`](web/src/lib/checks/config.ts). The same TypeScript code
runs in the app, in the tests and in the offline evaluation.

## Evaluation

_To be filled in with real numbers._ Planned: about 40 labelled trials (half done
correctly, half with one deliberate error each), recorded by more than one person, split
into a tuning set and a held-out test set. Reported per reason: precision and recall with
95% Wilson intervals; at trial level: the share of invalid trials caught and the false
alarm rate on valid trials.

| | value |
|---|---|
| invalid trials caught | TODO |
| false alarms on valid trials | TODO |

## Run it

```bash
cd web
npm install
npm run dev          # http://localhost:5173, allow camera access
npm test             # unit tests, including synthetic trials with injected faults
npm run check        # type checks
```

Evaluate labelled recordings (trial files in `data/trials/`, labels in `data/labels.csv`):

```bash
cd web && npm run check-trials
cd ../analysis && pip install -r requirements.txt
python -m poseproof_analysis.evaluate --split test --out ../results/eval_test.md
```

## 2D-to-3D lifting

Planned and scaffolded in [docs/lifting.md](docs/lifting.md): a VideoPose3D-style temporal
network trained on AIST++ (split by dancer), evaluated with MPJPE and PA-MPJPE on held-out
dancers and on own squats against a two-camera triangulated reference, exported to ONNX and
compared with MediaPipe 3D side by side in the viewer.

| Lifter | MPJPE AIST++ test | PA-MPJPE AIST++ test | MPJPE own squats |
|---|---|---|---|
| MediaPipe 3D | TODO | TODO | TODO |
| Temporal lifter | TODO | TODO | TODO |

## Repository

```
web/                  Svelte + TypeScript app (Vite), deployed on Vercel
  src/lib/pose/       MediaPipe loading, landmark names, drawing
  src/lib/trial/      trial file format, recorder, samples
  src/lib/checks/     the checks, thresholds, helpers
  src/lib/synthetic/  stick-figure squats with injectable faults (for tests and demo)
  src/lib/lifting/    2D-to-3D lifter interface
  src/lib/viz/        3D scene (three.js), timeline signals, playback clock
  scripts/            make-samples, check-trials
analysis/             Python: evaluation report, video export, two-camera 3D reference,
                      temporal lifter (lifting/)
data/                 local recordings and labels (not in git, except templates)
docs/                 recording protocol, background, printable checkerboard
```

## Limitations

- One camera gives depth only as a model estimate; world coordinates from MediaPipe are
  relative to the hips and their scale is learned, not measured.
- Thresholds tuned on a few people do not transfer automatically to everyone; the test
  split is kept separate for that reason.
- The checks decide whether a trial is valid. They do not score mobility.

## References

- Jo et al. (2022). Agreement between Azure Kinect and marker-based motion analysis during functional movements. *Sensors*. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9785788/
- Nakano et al. (2020). Evaluation of 3D markerless motion capture accuracy using OpenPose with multiple video cameras. *Frontiers in Sports and Active Living*. https://pmc.ncbi.nlm.nih.gov/articles/PMC7739760
- Needham et al. (2021). The accuracy of several pose estimation methods for 3D joint centre localisation. *Scientific Reports*. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8526586/
- MediaPipe Pose Landmarker. https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
