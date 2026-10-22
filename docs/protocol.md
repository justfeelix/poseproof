# Recording protocol

## A. Labelled trials for the evaluation (about 1.5 h for one person)

**Setup.** Laptop or phone on a table or stand at about hip height, 2.5 to 3 m away,
landscape. Even light, no bright window behind you. Fitted clothes, shoes off or flat
shoes. Use the same model setting (`full`) for all trials and write it down.

**Each trial.** Press Start test, stand still for about two seconds, do three squats,
then stand until the recording ends (20 s). Download the trial right away, and note in
`data/labels.csv` what you did, before you look at the app's verdict.

**Plan (front test unless noted), about 40 trials:**

| Trials | What you do | Label |
|---|---|---|
| 8 | correct: calm start, three controlled squats to about parallel, heels down | valid |
| 4 | correct, **side test** | valid |
| 3 | camera too low or you too close, feet cut off | OUT_OF_FRAME |
| 3 | a second person walks through behind you | MULTI_PERSON |
| 3 | front test, but turned 30 to 45 degrees | WRONG_ORIENTATION |
| 3 | a chair or bag hides one lower leg | JOINT_HIDDEN |
| 3 | start squatting the moment recording starts | NO_CALM_START |
| 3 | quarter squats only | DEPTH_NOT_REACHED |
| 3 | heels clearly up at the bottom | HEEL_LIFT |
| 3 | fast bouncing reps, under a second down | TOO_FAST |
| 2 | baggy clothes or dim light (tracker stress) | label what actually happened |

Rules for labels:
- Label what you **did**, not what the app said. If you meant to do one error but did a
  second one by accident (e.g. heels came up during the fast reps), list both reasons.
- `valid = 1` only with no reasons. Unsure? Write it in `note` and decide before looking
  at results.
- `split`: decide up front. Best: a second person's trials are `test`, yours are `tune`.
  With only yourself: the trials of the last session are `test`.

**Other people.** Only with their consent. Explain that no video is stored, only the
landmark file, and that you will not publish their files unless they agree.

## B. Two-camera reference (optional, GUIDE.md step R)

Two cameras (phone and laptop, or two phones), both seeing the whole body, 60 to 90
degrees apart, same resolution and frame rate, video stabilisation off, focus and exposure
locked. Do not move them between calibration and the last trial.

1. **Intrinsics** per camera (1 min each): move the printed checkerboard
   (`checkerboard_A4_9x6_25mm.pdf`, printed at 100%, glued flat; check that 4 squares
   measure 100 mm) slowly through the whole image, tilted, near the corners.
2. **Stereo** (1 min, both recording): hold the board where both cameras see it, still for
   about a second, 15 to 20 positions.
3. **Trials** (both recording, same file name in both folders): one clap with straight arms
   at the start (for synchronisation), then the trial as in part A.
4. Measure the distance between the two lenses with a tape: the calibrated baseline must
   match it within a few millimetres, the best single check that calibration worked.

Background: OpenCV camera calibration tutorial, https://docs.opencv.org/4.x/dc/dbb/tutorial_py_calibration.html
