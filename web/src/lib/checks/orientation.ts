/**
 * orientation: is the person turned the right way for this test?    >>> Felix implements <<<
 *
 * squat_front: shoulders and hips roughly parallel to the image plane.
 * squat_side:  turned about 90 degrees, shoulder line pointing at the camera.
 * EGYM's back-of-thigh test is done rotated 90 degrees to the camera, so both cases matter.
 *
 * Idea: in world coordinates (camera-aligned, metres) the shoulder line is
 *   s = left_shoulder - right_shoulder. Its angle to the image plane is
 *   atan2(|s.z|, |s.x|) in degrees (0 = facing the camera, 90 = side-on).
 * Do the same for the hips and average the two angles.
 *
 * TODO
 *   1. per frame with a person: angle as above (use xyz/sub from ./util).
 *   2. a = median of the per-frame angles (robust to single bad frames).
 *   3. front: ok = a <= cfg.frontMaxDeg; side: ok = a >= cfg.sideMinDeg (ctx.test tells which).
 *   4. return decide('orientation', ok, a, threshold, 'deg').
 *
 * Pitfalls
 *   - World z (depth) is the least accurate axis of MediaPipe. If the angle is too noisy,
 *     try an image-based cue: shoulder width in the image divided by torso length in the
 *     image shrinks as the person turns (foreshortening). Compare both on real trials.
 *   - In the side test the far shoulder is often hidden; that is expected, not a failure.
 *
 * Config: config.orientation.frontMaxDeg, sideMinDeg
 * Test: SYNTHETIC_CASES.WRONG_ORIENTATION (front test turned 40 deg) must fail.
 */
import { todo } from './result'
import type { CheckDef } from './types'

export const orientation: CheckDef = {
  id: 'orientation',
  reason: 'WRONG_ORIENTATION',
  label: 'Facing the right way',
  feedback: 'Turn so you face the camera directly (or stand side-on for the side test).',
  live: true,
  run(_frames, _ctx) {
    return todo('orientation')
  },
}
