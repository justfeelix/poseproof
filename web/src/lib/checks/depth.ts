/**
 * depth: did the squat go deep enough to be scored?                    >>> Felix implements <<<
 *
 * Knee flexion = 180 - jointAngleDeg(hip, knee, ankle), so 0 is a straight leg. Use world
 * coordinates (3D) so the angle does not depend on the viewing direction as much.
 *
 * TODO
 *   1. per frame: flexion of the left and right knee.
 *      squat_front: mean of both. squat_side: the near leg only (higher visibility).
 *   2. smooth with movingAverage(values, 5) so a single bad frame cannot fake depth.
 *   3. peak = max of the smoothed series. (Better, once tempo.ts finds reps: the median of
 *      the per-rep peaks, so one deep rep cannot hide two shallow ones. Your choice; write
 *      it down.)
 *   4. return decide('depth', peak >= cfg.minKneeFlexionDeg, peak, cfg.minKneeFlexionDeg, 'deg').
 *
 * Pitfall: MediaPipe tends to underestimate maximum flexion (markerless studies report
 * weaker agreement at the extremes of the range). Compare with the two-camera reference if
 * you do step R of GUIDE.md.
 *
 * Config: config.depth.minKneeFlexionDeg
 * Test: SYNTHETIC_CASES.DEPTH_NOT_REACHED (45 deg) must fail; CLEAN (105 deg) must pass.
 */
import { todo } from './result'
import type { CheckDef } from './types'

export const depth: CheckDef = {
  id: 'depth',
  reason: 'DEPTH_NOT_REACHED',
  label: 'Deep enough',
  feedback: 'Go lower: aim for your thighs to be about parallel to the floor.',
  live: false,
  run(_frames, _ctx) {
    return todo('depth')
  },
}
