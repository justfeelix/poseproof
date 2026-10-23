/**
 * tempo: was every rep slow enough to be controlled?
 *
 * This is also where reps are found; depth.ts reuses findReps.
 *
 * Signal: standing height h(t) (see util.ts), smoothed over 5 frames. It drops when
 * squatting.
 *
 * Rep segmentation with hysteresis (two thresholds, so noise around one threshold cannot
 * start and end a rep over and over):
 *   top    = 90th percentile of h: the standing level. The person stands for a good part of
 *            the trial, so this does not depend on a calm start (each check should fail for
 *            its own reason only: a missing calm start must not turn into TOO_FAST).
 *   bottom = min(h). If top - bottom < config.tempo.minRangeM there were no reps.
 *   high = top - 15% of the range (near standing), low = top - 60% of the range (clearly down).
 *   Walking through time in two states:
 *     standing: remember the last time h > high; when h < low, a rep starts at that time.
 *     in rep:   track the lowest point; when h > high again, the rep ends.
 *   A rep still going when the trial ends is dropped.
 *
 * tempo: descent = bottom - start for each rep; the fastest descent must be at least
 * config.tempo.minDescentS. The descent is measured from the last moment the person was
 * still near standing height, so the slow start of a movement counts.
 */
import type { Frame } from '../trial/types'
import type { CheckConfig } from './config'
import { decide } from './result'
import type { CheckDef } from './types'
import { heightSeries, quantile, smoothNullable } from './util'

/** One repetition; times in ms of trial time. */
export interface Rep {
  start: number
  bottom: number
  end: number
}

export function findReps(frames: Frame[], config: CheckConfig): Rep[] {
  const smooth = smoothNullable(heightSeries(frames), 5)
  const t: number[] = []
  const h: number[] = []
  smooth.forEach((x, i) => {
    if (x !== null) {
      t.push(frames[i].t)
      h.push(x)
    }
  })
  if (h.length === 0) return []

  const top = quantile(h, 0.9)
  const range = top - h.reduce((m, x) => Math.min(m, x), Infinity)
  if (range < config.tempo.minRangeM) return []
  const high = top - 0.15 * range
  const low = top - 0.6 * range

  const reps: Rep[] = []
  let inRep = false
  let lastHigh = t[0]
  let start = t[0]
  let bottomT = t[0]
  let bottomH = Infinity
  for (let i = 0; i < h.length; i++) {
    if (!inRep) {
      if (h[i] > high) lastHigh = t[i]
      else if (h[i] < low) {
        inRep = true
        start = lastHigh
        bottomT = t[i]
        bottomH = h[i]
      }
    } else {
      if (h[i] < bottomH) {
        bottomH = h[i]
        bottomT = t[i]
      }
      if (h[i] > high) {
        reps.push({ start, bottom: bottomT, end: t[i] })
        inRep = false
        lastHigh = t[i]
      }
    }
  }
  return reps
}

export const tempo: CheckDef = {
  id: 'tempo',
  reason: 'TOO_FAST',
  label: 'Controlled tempo',
  feedback: 'Slow down: take at least a second on the way down.',
  live: false,
  run(frames, { config }) {
    const { minDescentS } = config.tempo
    const reps = findReps(frames, config)
    if (reps.length === 0) return decide('tempo', false, 0, minDescentS, 's', 'no reps found')

    const descents = reps.map((r) => (r.bottom - r.start) / 1000)
    const fastest = Math.min(...descents)
    const tooFast = reps.filter((_, i) => descents[i] < minDescentS)
    return {
      ...decide('tempo', fastest >= minDescentS, fastest, minDescentS, 's', `${reps.length} reps, fastest descent ${fastest.toFixed(2)} s`),
      spans: tooFast.map((r): [number, number] => [r.start, r.bottom]),
    }
  },
}
