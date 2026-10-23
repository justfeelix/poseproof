/**
 * calm_start: did the person stand still before the first rep?
 *
 * Why: the standing posture at the start is the baseline for the movement checks. The idea
 * is to compare a person against their own resting state, not against a population average.
 *
 * Signal: standing height h(t) = vertical distance from the hip midpoint to the ankle
 * midpoint (standingHeight in util.ts). It drops when the person squats, so its spread in
 * the first config.calmStart.windowS seconds tells whether they were still.
 *
 * Method: h over the baseline frames that contain a person; s = standard deviation of h;
 * pass if s <= config.calmStart.maxHipStdM. With fewer than MIN_FRAMES frames in the window
 * the trial is too short to know, which fails.
 */
import type { Frame } from '../trial/types'
import type { CheckConfig } from './config'
import { decide } from './result'
import type { CheckDef } from './types'
import { heightSeries, std } from './util'

/** Fewer frames than this in the baseline window: cannot judge. */
const MIN_FRAMES = 10

/** The frames of the baseline window: the first config.calmStart.windowS seconds. */
export function baselineFrames(frames: Frame[], config: CheckConfig): Frame[] {
  return frames.filter((f) => f.t / 1000 < config.calmStart.windowS)
}

export const calmStart: CheckDef = {
  id: 'calm_start',
  reason: 'NO_CALM_START',
  label: 'Calm start',
  feedback: 'Stand still for two seconds before your first squat.',
  live: false,
  run(frames, { config }) {
    const { windowS, maxHipStdM } = config.calmStart
    const base = baselineFrames(frames, config)
    const h = heightSeries(base).filter((x): x is number => x !== null)
    if (h.length < MIN_FRAMES) {
      return decide('calm_start', false, 0, maxHipStdM, 'm', `too short to know: ${h.length} frames in the first ${windowS} s`)
    }

    const s = std(h)
    const ok = s <= maxHipStdM
    const detail = ok ? undefined : `moved ${(s * 100).toFixed(1)} cm (std) in the first ${windowS} s`
    return {
      ...decide('calm_start', ok, s, maxHipStdM, 'm', detail),
      spans: ok ? [] : [[base[0].t, base[base.length - 1].t]],
    }
  },
}
