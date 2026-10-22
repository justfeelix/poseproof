/**
 * calm_start: did the person stand still before the first rep?   (TODO: implement)
 *
 * Why: the standing posture at the start is the baseline for other checks (heel height,
 * standing hip height for rep detection). The same idea as the 14-second face baseline in
 * Vibe Shuffle: compare against the person's own resting state, not a population average.
 *
 * Signal: standing height h(t) = vertical distance from the hip midpoint to the ankle
 * midpoint. In world coordinates the hip midpoint is the origin and y points down, so
 * h(t) = mean(left_ankle.y, right_ankle.y). It drops when the person squats.
 *
 * TODO
 *   1. frames in the first cfg.windowS seconds (frame.t / 1000 < windowS) with a person.
 *      If there are fewer than ~10 such frames: fail (too short to know).
 *   2. s = std(h over those frames).
 *   3. return decide('calm_start', s <= cfg.maxHipStdM, s, cfg.maxHipStdM, 'm').
 *
 * Tip: export a helper `baselineFrames(frames, cfg)` here; heels.ts and tempo.ts need the
 * same baseline.
 *
 * Config: config.calmStart.windowS, maxHipStdM
 * Test: SYNTHETIC_CASES.NO_CALM_START must fail.
 */
import { todo } from './result'
import type { CheckDef } from './types'

export const calmStart: CheckDef = {
  id: 'calm_start',
  reason: 'NO_CALM_START',
  label: 'Calm start',
  feedback: 'Stand still for two seconds before your first squat.',
  live: false,
  run(_frames, _ctx) {
    return todo('calm_start')
  },
}
