# data/ (local, not in git)

```
data/
  trials/<trial_id>.json      trial files downloaded from the app (or exported from video)
  labels.csv                  your labels, one row per trial (copy labels.template.csv)
  verdicts.csv                written by `npm run check-trials` in web/
  raw/<session>/camA|camB/    videos for the optional two-camera reference (never in git)
  calib/<session>/            calibration results (camA.json, camB.json, stereo.json)
  processed/<session>/        MediaPipe and triangulation output (.npz)
```

Trial files contain body landmarks only, no images. Still, they describe a real person's
movement: keep other people's files local unless they agreed to publish them.

`labels.csv` columns: `trial_id` (file name without .json), `person`, `split` (`tune` or
`test`), `valid` (1 or 0), `reasons` (codes separated by `;`, empty when valid), `note`.
Reason codes: OUT_OF_FRAME, MULTI_PERSON, WRONG_ORIENTATION, JOINT_HIDDEN,
TRACKING_UNSTABLE, NO_CALM_START, DEPTH_NOT_REACHED, HEEL_LIFT, TOO_FAST.
