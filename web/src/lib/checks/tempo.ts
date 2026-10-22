/**
 * tempo: was every rep slow enough to be controlled?   (TODO: implement)
 *
 * This is also where reps are found, which depth.ts can reuse.
 *
 * Signal: standing height h(t) as in calmStart.ts (drops when squatting), smoothed.
 *
 * TODO (rep segmentation with hysteresis)
 *   1. h = movingAverage(h, 5). top = median of h over the calm-start window;
 *      bottom = min(h). If top - bottom < cfg.minRangeM there were no reps: fail with
 *      detail "no reps".
 *   2. high = top - 0.15 * (top - bottom), low = top - 0.6 * (top - bottom).
 *   3. walk through time with two states:
 *        standing: remember the last time h > high; when h < low, a rep starts.
 *        in rep:   track the time of the minimum of h; when h > high again, the rep ends.
 *      Each rep: { start: last time above high, bottom: time of the minimum, end }.
 *      Export it as `findReps(frames, cfg)` so depth.ts can use it too.
 *   4. descent = bottom - start for each rep; fastest = the smallest one.
 *   5. return decide('tempo', fastest >= cfg.minDescentS, fastest, cfg.minDescentS, 's',
 *      `${reps.length} reps`).
 *
 * Pitfall: without a calm start, `top` is wrong and the first rep looks too fast. That is
 * fine (the trial fails calm_start anyway) but mention it when you discuss false alarms.
 *
 * Config: config.tempo.minDescentS, minRangeM
 * Test: SYNTHETIC_CASES.TOO_FAST (0.35 s descents) must fail; CLEAN (1.4 s) must pass.
 * Extra test worth writing: findReps on CLEAN returns exactly 3 reps.
 */
import { todo } from './result'
import type { CheckDef } from './types'

export const tempo: CheckDef = {
  id: 'tempo',
  reason: 'TOO_FAST',
  label: 'Controlled tempo',
  feedback: 'Slow down: take at least a second on the way down.',
  live: false,
  run(_frames, _ctx) {
    return todo('tempo')
  },
}
