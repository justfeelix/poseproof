"""Run MediaPipe Pose Landmarker on a video.  (TODO: implement)

Output (via poseproof_analysis.io.save_keypoints):
    kp2d      (T, 33, 3)  pixel x, pixel y, visibility      (NaN where no person found)
    kp3d      (T, 33, 3)  MediaPipe *world* landmarks in mm (hip-midpoint origin)
    t_ms      (T,)        timestamps used for detect_for_video
    fmt       "mediapipe33"

Guide: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/python
Model: download "Pose landmarker (Heavy)" from the Models section of
https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker into models/.
"""

from __future__ import annotations

from pathlib import Path


def run_pose_landmarker(video_path: str | Path, model_path: str | Path,
                        out_path: str | Path, min_confidence: float = 0.5) -> Path:
    """Process every frame of `video_path` and save the npz described above.

    TODO
    1. options = vision.PoseLandmarkerOptions(base_options=BaseOptions(model_asset_path=...),
       running_mode=vision.RunningMode.VIDEO, num_poses=1,
       min_pose_detection_confidence=min_confidence, ...)
    2. cap = cv2.VideoCapture(video); fps = cap.get(cv2.CAP_PROP_FPS); w, h from the frame.
    3. For frame i: rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB);
       image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb);
       res = landmarker.detect_for_video(image, int(round(i * 1000 / fps)))
       (timestamps must strictly increase).
    4. res.pose_landmarks[0][j].x * w, .y * h, .visibility  -> kp2d[i, j]
       res.pose_world_landmarks[0][j].x/.y/.z * 1000         -> kp3d[i, j]  (metres -> mm)
       If res.pose_landmarks is empty, leave the row as NaN.
    5. Save with poseproof_analysis.io.save_keypoints.

    Pitfall: phone videos recorded in portrait carry a rotation flag. Record in landscape,
    or check that the frames OpenCV returns are upright (draw the keypoints once).
    """
    raise NotImplementedError
