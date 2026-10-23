/**
 * depth: did the squat go deep enough to be scored?
 *
 * Knee flexion = 180 - jointAngleDeg(hip, knee, ankle), so 0 is a straight leg. World
 * coordinates (3D) are used so the angle does not depend on the viewing direction as much.
 *
 * Method:
 *   1. Per frame: flexion of the left and right knee. Front test: mean of both. Side test:
 *      the near leg only (nearerSide in util.ts).
 *   2. Smooth over 5 frames so a single bad frame cannot fake depth.
 *   3. One peak per rep (reps from findReps in tempo.ts); the value is the MEDIAN of the
 *      peaks, so one deep rep cannot hide two shallow ones. If no reps are found, the
 *      deepest smoothed frame is reported instead (and will usually fail).
 *   4. Pass if the value is at least config.depth.minKneeFlexionDeg.
 *
 * Limit: MediaPipe tends to underestimate maximum flexion (markerless studies report weaker
 * agreement at the extremes of the range). Compare with the two-camera reference if you do
 * step R of GUIDE.md.
 */
import { LM, type LandmarkName } from '../pose/landmarks'
import { decide } from './result'
import { findReps } from './tempo'
import type { CheckDef } from './types'
import { jointAngleDeg, mean, median, nearerSide, primaryPose, smoothNullable } from './util'

export const depth: CheckDef = {
  id: 'depth',
  reason: 'DEPTH_NOT_REACHED',
  label: 'Deep enough',
  feedback: 'Go lower: aim for your thighs to be about parallel to the floor.',
  live: false,
  run(frames, { test, config }) {
    const { minKneeFlexionDeg } = config.depth

    // 1. Knee flexion per frame.
    const sides = test === 'squat_side' ? [nearerSide(frames)] : (['left', 'right'] as const)
    const flexion = frames.map((f) => {
      const p = primaryPose(f)
      if (!p) return null
      const angles = sides.map((s) => {
        const at = (j: string) => p.world[LM[`${s}_${j}` as LandmarkName]]
        return 180 - jointAngleDeg(at('hip'), at('knee'), at('ankle'))
      })
      return mean(angles)
    })
    if (flexion.every((x) => x === null)) return decide('depth', false, 0, minKneeFlexionDeg, 'deg', 'no person detected')

    // 2. Smooth, 3. one peak per rep.
    const smooth = smoothNullable(flexion, 5)
    const reps = findReps(frames, config)
    const peaks = reps
      .map((r) => {
        const inRep = smooth.filter((x, i): x is number => x !== null && frames[i].t >= r.start && frames[i].t <= r.end)
        return inRep.length ? Math.max(...inRep) : NaN
      })
      .filter((x) => !Number.isNaN(x))

    let value: number
    let detail: string
    if (peaks.length > 0) {
      value = median(peaks)
      detail = `${peaks.length} reps, peak flexion ${peaks.map((x) => Math.round(x)).join(', ')} deg (median counts)`
    } else {
      value = smooth.reduce<number>((m, x) => (x !== null && x > m ? x : m), 0)
      detail = `no reps found; deepest frame ${Math.round(value)} deg`
    }
    return decide('depth', value >= minKneeFlexionDeg, value, minKneeFlexionDeg, 'deg', detail)
  },
}
