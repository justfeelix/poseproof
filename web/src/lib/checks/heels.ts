/**
 * heels: did the heels stay on the floor?                               >>> Felix implements <<<
 *
 * Why: lifting the heels hides limited ankle mobility, which is exactly what a mobility
 * test wants to measure.
 *
 * Signal per foot, world coordinates (y points down):
 *   d(t) = foot_index.y - heel.y        (about 0 when the foot is flat; grows when the heel
 *                                        rises above the toes)
 * Subtract the standing baseline so camera tilt and model bias cancel:
 *   lift(t) = d(t) - median(d over the calm-start window)
 *
 * TODO
 *   1. baseline window: the calm-start frames (reuse a helper from calmStart.ts).
 *   2. lift(t) for both feet (side test: near foot only), smooth with movingAverage(…, 5).
 *   3. worst = max over time and feet.
 *   4. return decide('heels', worst <= cfg.maxLiftM, worst, cfg.maxLiftM, 'm').
 *
 * Pitfall: in the front view the foot points at the camera, so heel and toe lie behind each
 * other and depth errors leak into y. Check on real trials whether the side test is more
 * reliable for this check, and say so in the README.
 *
 * Config: config.heels.maxLiftM
 * Test: SYNTHETIC_CASES.HEEL_LIFT (5 cm) must fail.
 */
import { todo } from './result'
import type { CheckDef } from './types'

export const heels: CheckDef = {
  id: 'heels',
  reason: 'HEEL_LIFT',
  label: 'Heels stay down',
  feedback: 'Keep your heels on the floor; only go as low as you can with flat feet.',
  live: false,
  run(_frames, _ctx) {
    return todo('heels')
  },
}
