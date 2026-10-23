/**
 * heels: did the heels stay on the floor?
 *
 * Why: lifting the heels hides limited ankle mobility, which is exactly what a mobility
 * test wants to measure.
 *
 * Signal per foot, world coordinates (y points down):
 *   d(t) = foot_index.y - heel.y   (about 0 when the foot is flat; grows when the heel rises
 *                                    above the toes)
 * The standing baseline is subtracted so camera tilt and model bias cancel:
 *   lift(t) = d(t) - median(d over the standing frames)
 *
 * Standing frames are the frames where the standing height is near its top (within 15% of
 * the squat range, at least 3 cm), wherever they are in the trial. That keeps this check
 * independent of calm_start. lift is smoothed over 5 frames; the worst lift over time and
 * feet is compared with config.heels.maxLiftM. Side test: near foot only.
 *
 * Limit: in the front view the foot points at the camera, so heel and toe lie behind each
 * other and depth errors leak into y. The side test may be more reliable for this check;
 * verify on real trials and say so in the README.
 */
import { LM, type LandmarkName } from '../pose/landmarks'
import { decide } from './result'
import type { CheckDef } from './types'
import { heightSeries, median, nearerSide, primaryPose, quantile, smoothNullable, spansOf } from './util'

export const heels: CheckDef = {
  id: 'heels',
  reason: 'HEEL_LIFT',
  label: 'Heels stay down',
  feedback: 'Keep your heels on the floor; only go as low as you can with flat feet.',
  live: false,
  run(frames, { test, config }) {
    const { maxLiftM } = config.heels

    // 1. Which frames are "standing"?
    const h = heightSeries(frames)
    const seen = h.filter((x): x is number => x !== null)
    if (seen.length === 0) return decide('heels', false, 0, maxLiftM, 'm', 'no person detected')
    const top = quantile(seen, 0.9)
    const range = top - seen.reduce((m, x) => Math.min(m, x), Infinity)
    const margin = Math.max(0.15 * range, 0.03)
    const standing = h.map((x) => x !== null && x >= top - margin)

    // 2. Lift per foot over time, relative to the standing baseline.
    const sides = test === 'squat_side' ? [nearerSide(frames)] : (['left', 'right'] as const)
    let worst = 0
    let worstSide: string = sides[0]
    const bad = frames.map(() => false)
    for (const side of sides) {
      const toe = `${side}_foot_index` as LandmarkName
      const heel = `${side}_heel` as LandmarkName
      const d = frames.map((f) => {
        const p = primaryPose(f)
        return p ? p.world[LM[toe]][1] - p.world[LM[heel]][1] : null
      })
      const base = median(d.filter((x, i): x is number => x !== null && standing[i]))
      const lift = smoothNullable(d.map((x) => (x === null ? null : x - (Number.isNaN(base) ? 0 : base))), 5)
      lift.forEach((x, i) => {
        if (x === null) return
        if (x > worst) {
          worst = x
          worstSide = side
        }
        if (x > maxLiftM) bad[i] = true
      })
    }

    // 3. Decide on the worst lift.
    const detail = `${worstSide} heel up ${(worst * 100).toFixed(1)} cm at most`
    return { ...decide('heels', worst <= maxLiftM, worst, maxLiftM, 'm', detail), spans: spansOf(frames, bad) }
  },
}
