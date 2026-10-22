# Capture and measurement protocol

One session, about 45 minutes with a helper. Do not move or touch the cameras between
calibration and the last trial; if one moves, record the stereo calibration again.

## Equipment

- Camera A: phone on a stand or propped up, landscape, about 3 m away, chest height.
- Camera B: second phone or laptop webcam, 60 to 90 degrees around the person from A.
- Checkerboard `docs/checkerboard_A4_9x6_25mm.pdf` printed at 100 %, glued flat on
  cardboard. Measure 4 squares with a ruler (should be 100 mm) and write it down.
- Tape measure, pen, a helper for the body measurements.
- Fitted clothing (shorts or leggings, T-shirt), even light, plain background, whole body
  including feet visible in both cameras.

## Camera settings (both cameras, same for calibration and trials)

- Same resolution and frame rate in both, e.g. 1920x1080 at 30 fps.
- Video stabilisation OFF (it changes the image geometry from frame to frame and breaks
  calibration). On iPhone also turn off Action mode and avoid Cinematic mode.
- Lock focus and exposure (iPhone: long press on the subject until "AE/AF LOCK"). No zoom,
  use the main 1x lens.

## Recording order

1. **Intrinsics, camera A** (1 min): move the board slowly through the whole image, near
   the corners and edges, tilted in different directions, 0.5 to 2 m from the lens.
   Repeat for **camera B**. Separate files: `calib_intrinsics.mp4` per camera.
2. **Stereo** (1 min, both cameras recording): hold the board where BOTH cameras see it
   fully, keep it still for about 1 s, move, still again; 15 to 20 positions across the
   space where you will stand. File: `calib_stereo.mp4` in both folders.
3. **Trials** (both cameras recording, one file per trial, same name in both folders).
   Start every trial with one clap, arms straight in front of you.
   - `tpose`: T-pose, hold 5 s; then A-pose (arms 45 degrees down), hold 5 s
   - `squat`: 5 slow bodyweight squats, 2 s down, 2 s up
   - `reach`: 5 slow overhead arm raises (front), then 5 sideways
   - `lunge`: 3 lunges per leg (optional)
   - `walk`: walk a small circle in view (optional, for occlusions)
4. **Camera baseline**: measure the distance between the two lenses with the tape.

## Body measurements (helper measures, twice each)

Fill `data/tape_measurements.csv` (copy of the template). Barefoot, standing upright,
arms hanging relaxed. Find the bony landmark with your fingers first, then measure from
landmark to landmark in a straight line (not along the skin curve).

| Segment | From | To |
|---|---|---|
| Height | floor | top of head |
| Shoulder width | left acromion (bony tip of shoulder) | right acromion |
| Upper arm | acromion | lateral epicondyle (outer elbow bone) |
| Forearm | lateral epicondyle | radial styloid (wrist, thumb side) |
| Thigh | greater trochanter (bony point on the side of the hip) | lateral knee joint line |
| Shank | lateral knee joint line | lateral malleolus (outer ankle bone) |
| Hip width | left greater trochanter | right greater trochanter |

The difference between your two measurements is the measurement noise of the tape
method. Report it next to the camera errors: it is the floor below which camera errors
cannot be judged.

## Recording other people

Only with their written consent, explaining that video stays on your laptop and only
derived keypoints may be published. Simplest: record only yourself for this sprint.
