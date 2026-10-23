/**
 * orientation: is the person turned the right way for this test?
 *
 * squat_front: shoulders and hips roughly parallel to the image plane.
 * squat_side:  turned about 90 degrees, shoulder line pointing at the camera.
 * Side-on tests (e.g. for the back of the thigh) are common in mobility assessments, so both
 * cases matter.
 *
 * Method (same three steps as framing):
 *   1. Per frame: the angle between the shoulder line and the image plane, and the same for
 *      the hip line, from MediaPipe's world landmarks (metres, camera-aligned: x to the
 *      right, z towards/away from the camera). For a line with direction d = left - right:
 *      angle = atan2(|d.z|, |d.x|)  ->  0 deg facing the camera, 90 deg side-on.
 *      The two angles are averaged, so one noisy line does not decide alone.
 *   2. One number for the trial: the median over all frames with a person (robust against
 *      single bad frames).
 *   3. Front test passes if it is at most config.orientation.frontMaxDeg, side test if it is
 *      at least config.orientation.sideMinDeg (ctx.test tells which).
 *
 * Limits (for the README): depth (world z) is the least accurate axis of a single-camera
 * model, so the angle is noisy; the front/side decision is robust, a precise angle is not.
 * Hidden far-side joints in the side test are expected and not penalised here (visibility is
 * a separate check). If real recordings show the angle is too noisy, compare it with an
 * image-based cue: shoulder width / torso length in the image shrinks as the person turns.
 */
import { LM } from '../pose/landmarks'
import type { Point4, PoseSample } from '../pose/types'
import { decide } from './result'
import type { CheckDef } from './types'
import { median, primaryPose, spansOf, sub, xyz } from './util'

/** Angle (0..90 deg) between the line through two world points and the image plane. */
function lineAngleDeg(left: Point4, right: Point4): number {
  const d = sub(xyz(left), xyz(right))
  return (Math.atan2(Math.abs(d[2]), Math.abs(d[0])) * 180) / Math.PI
}

/** How far the body is turned away from the camera: mean of the shoulder and hip line angles. */
function turnAngleDeg(p: PoseSample): number {
  const shoulders = lineAngleDeg(p.world[LM.left_shoulder], p.world[LM.right_shoulder])
  const hips = lineAngleDeg(p.world[LM.left_hip], p.world[LM.right_hip])
  return (shoulders + hips) / 2
}

export const orientation: CheckDef = {
  id: 'orientation',
  reason: 'WRONG_ORIENTATION',
  label: 'Facing the right way',
  feedback: 'Turn so you face the camera directly (or stand side-on for the side test).',
  live: true,
  run(frames, { test, config }) {
    const { frontMaxDeg, sideMinDeg } = config.orientation
    const front = test === 'squat_front'
    const threshold = front ? frontMaxDeg : sideMinDeg

    // 1. Angle per frame (null where nobody was detected).
    const angles = frames.map((f) => {
      const p = primaryPose(f)
      return p ? turnAngleDeg(p) : null
    })
    const seen = angles.filter((a): a is number => a !== null)
    if (seen.length === 0) return decide('orientation', false, 0, threshold, 'deg', 'no person detected')

    // 2. One number for the trial.
    const a = median(seen)

    // 3. Compare with the threshold; the direction depends on the test.
    const ok = front ? a <= threshold : a >= threshold
    const wrong = angles.map((x) => x !== null && (front ? x > threshold : x < threshold))
    const detail = `body line ${Math.round(a)} deg to the image plane; ${front ? 'front test needs at most' : 'side test needs at least'} ${threshold} deg`
    return { ...decide('orientation', ok, a, threshold, 'deg', detail), spans: spansOf(frames, wrong) }
  },
}
