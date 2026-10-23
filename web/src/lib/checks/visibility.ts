/**
 * visibility: are the joints we measure actually visible?
 *
 * Why: joints hidden behind the body are guessed by the model. Depth cameras like the Azure
 * Kinect show the same problem: the hip angle on the side hidden from the camera had poor
 * validity (Jo et al. 2022, Sensors). A score computed from guessed joints should not count.
 *
 * Key joints: hips, knees, ankles, heels.
 *   squat_front: both sides.
 *   squat_side:  only the side closer to the camera (nearerSide in util.ts); the far side is
 *                expected to be hidden.
 *
 * Method: for each key joint, the share of frames where its visibility (point[3]) is below
 * config.visibility.minVisibility. A frame without a person counts as hidden. The worst
 * joint decides: pass if its hidden share is at most config.visibility.maxHiddenFraction.
 *
 * Limit: no synthetic fault covers this check; MediaPipe's visibility is itself a model
 * output, so it has to be checked against real trials with a deliberately hidden leg.
 */
import { LM, type LandmarkName } from '../pose/landmarks'
import { decide } from './result'
import type { CheckDef } from './types'
import { nearerSide, primaryPose, spansOf } from './util'

const JOINTS = ['hip', 'knee', 'ankle', 'heel'] as const

export const visibility: CheckDef = {
  id: 'visibility',
  reason: 'JOINT_HIDDEN',
  label: 'Legs clearly visible',
  feedback: 'Make sure nothing blocks the camera’s view of your legs and feet.',
  live: true,
  run(frames, { test, config }) {
    const { minVisibility, maxHiddenFraction } = config.visibility
    if (frames.length === 0) return decide('visibility', false, 1, maxHiddenFraction, 'share of frames', 'no frames')

    // 1. Which joints matter for this test.
    const sides = test === 'squat_side' ? [nearerSide(frames)] : (['left', 'right'] as const)
    const key = sides.flatMap((side) => JOINTS.map((j) => `${side}_${j}` as LandmarkName))

    // 2. Per joint: in how many frames is it hidden (or the person missing)?
    const hiddenIn = new Map<LandmarkName, number>(key.map((name) => [name, 0]))
    const anyHidden: boolean[] = []
    for (const frame of frames) {
      const p = primaryPose(frame)
      let any = false
      for (const name of key) {
        if (!p || p.image[LM[name]][3] < minVisibility) {
          hiddenIn.set(name, (hiddenIn.get(name) ?? 0) + 1)
          any = true
        }
      }
      anyHidden.push(any)
    }

    // 3. The worst joint decides.
    const [worstName, worstCount] = [...hiddenIn.entries()].sort((a, b) => b[1] - a[1])[0]
    const worst = worstCount / frames.length
    const detail = `${worstName} hidden in ${Math.round(100 * worst)}% of frames`
    return {
      ...decide('visibility', worst <= maxHiddenFraction, worst, maxHiddenFraction, 'share of frames', detail),
      spans: spansOf(frames, anyHidden),
    }
  },
}
