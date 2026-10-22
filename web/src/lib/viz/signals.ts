/**
 * Signals drawn on the review timeline. Display only: the checks make their own decisions.
 */
import { LM } from '../pose/landmarks'
import type { Frame } from '../trial/types'
import { jointAngleDeg, primaryPose } from '../checks/util'

export interface Series {
  t: number[] // ms
  knee: (number | null)[] // knee flexion in degrees, mean of both legs (0 = straight)
  hip: (number | null)[] // hip height above the ankles in metres (drops when squatting)
}

export function signals(frames: Frame[]): Series {
  const t: number[] = []
  const knee: (number | null)[] = []
  const hip: (number | null)[] = []
  for (const f of frames) {
    t.push(f.t)
    const p = primaryPose(f)
    if (!p) {
      knee.push(null)
      hip.push(null)
      continue
    }
    const w = p.world
    const flex = (h: number, k: number, a: number) => 180 - jointAngleDeg(w[h], w[k], w[a])
    knee.push((flex(LM.left_hip, LM.left_knee, LM.left_ankle) + flex(LM.right_hip, LM.right_knee, LM.right_ankle)) / 2)
    hip.push((w[LM.left_ankle][1] + w[LM.right_ankle][1]) / 2)
  }
  return { t, knee, hip }
}

/** Value of a series at time tMs (nearest earlier frame). */
export function valueAt(s: Series, values: (number | null)[], tMs: number): number | null {
  let lo = 0
  let hi = s.t.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (s.t[mid] <= tMs) lo = mid
    else hi = mid - 1
  }
  return values[lo] ?? null
}
