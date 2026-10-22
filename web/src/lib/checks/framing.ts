/**
 * framing: is the whole body inside the image?
 *
 * WORKED EXAMPLE. The other checks follow the same pattern:
 *   1. pull what you need from the frames (here: image coordinates of the primary person),
 *   2. reduce it to one number (here: share of frames where all required points are inside),
 *   3. compare it with a threshold from config.ts and return decide(...).
 *
 * MediaPipe keeps predicting points that leave the image (x or y outside 0..1), so the
 * coordinates alone tell us whether a body part is cut off. A frame without any person
 * counts as "not in frame".
 */
import { LM, type LandmarkName } from '../pose/landmarks'
import { decide } from './result'
import type { CheckDef } from './types'
import { primaryPose } from './util'

/** Head, hands and feet: the extremes of the body. */
const REQUIRED: LandmarkName[] = [
  'nose',
  'left_wrist', 'right_wrist',
  'left_heel', 'right_heel',
  'left_foot_index', 'right_foot_index',
]

export const framing: CheckDef = {
  id: 'framing',
  reason: 'OUT_OF_FRAME',
  label: 'Whole body in the picture',
  feedback: 'Step back until your head and feet are both visible.',
  live: true,
  run(frames, { config }) {
    const { margin, minFrameFraction } = config.framing
    if (frames.length === 0) return decide('framing', false, 0, minFrameFraction, 'share of frames', 'no frames')

    let inside = 0
    const misses = new Map<LandmarkName, number>()
    for (const frame of frames) {
      const p = primaryPose(frame)
      if (!p) continue
      let all = true
      for (const name of REQUIRED) {
        const [x, y] = p.image[LM[name]]
        if (x < margin || x > 1 - margin || y < margin || y > 1 - margin) {
          all = false
          misses.set(name, (misses.get(name) ?? 0) + 1)
        }
      }
      if (all) inside++
    }

    const share = inside / frames.length
    const worst = [...misses.entries()].sort((a, b) => b[1] - a[1])[0]
    const detail = worst ? `${worst[0]} outside in ${Math.round((100 * worst[1]) / frames.length)}% of frames` : undefined
    return decide('framing', share >= minFrameFraction, share, minFrameFraction, 'share of frames', detail)
  },
}
