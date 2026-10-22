# data/ (not in git)

```
data/
  raw/<session>/camA/calib_intrinsics.mp4, calib_stereo.mp4, <trial>.mp4
  raw/<session>/camB/...                      (same file names in both folders)
  calib/<session>/camA.json, camB.json, stereo.json
  processed/<session>/<trial>_camA_mp.npz     MediaPipe output (poselab.io format)
  processed/<session>/<trial>_tri.npz         triangulated 3D, mm, camera-A frame
  aistpp/cameras/, keypoints2d/, keypoints3d/ AIST++ annotations
  tape_measurements.csv                       copy of the template, filled in
```

Raw video shows a person and stays local. Processed keypoints (`.npz`) contain no images;
share them only if everyone recorded agreed.
