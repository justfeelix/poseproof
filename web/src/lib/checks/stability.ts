/**
 * stability: did the tracker follow the body without glitches?
 *
 * Why: bones do not change length. If the measured thigh suddenly gets 20% longer, or a
 * knee jumps 30 cm between two frames, the tracker lost the joint or swapped left and right.
 * About 10% of OpenPose joint errors were above 40 mm because of such failures
 * (Nakano et al. 2020). A score computed through a glitch is not trustworthy.
 *
 * Two signals, both in world coordinates (metres):
 *   a) bone length: for every bone in RIGID_BONES (../pose/landmarks) the length per frame;
 *      cv = robustCv(lengths) (spread relative to the median). Worst bone = largest cv.
 *   b) jumps: per frame, displacement of knees and ankles since the previous frame with a
 *      person; a frame counts as a jump frame when any of them moves more than
 *      config.stability.maxJumpM.
 * Pass if worst cv <= maxBoneCv and the number of jump frames <= maxJumpFrames (0 until
 * real trials say otherwise).
 *
 * Pitfall: world coordinates are centred on the hip midpoint every frame, so a glitch in one
 * hip also moves every other point. Distances between joints (bone lengths) are therefore
 * more reliable than absolute positions.
 */
import { LM, RIGID_BONES, type LandmarkName } from '../pose/landmarks'
import type { PoseSample } from '../pose/types'
import { decide } from './result'
import type { CheckDef } from './types'
import { dist, primaryPose, robustCv, spansOf } from './util'

const JUMP_JOINTS: LandmarkName[] = ['left_knee', 'right_knee', 'left_ankle', 'right_ankle']

export const stability: CheckDef = {
  id: 'stability',
  reason: 'TRACKING_UNSTABLE',
  label: 'Tracking stable',
  feedback: 'Wear fitted clothes and make sure the room is evenly lit, then try again.',
  live: false,
  run(frames, { config }) {
    const { maxBoneCv, maxJumpM, maxJumpFrames } = config.stability
    const persons = frames.map(primaryPose)
    if (persons.every((p) => p === null)) return decide('stability', false, 0, maxBoneCv, 'cv', 'no person detected')

    // a) Bone lengths: the worst coefficient of variation.
    let worstCv = 0
    let worstBone = '-'
    for (const [name, [a, b]] of Object.entries(RIGID_BONES)) {
      const lengths: number[] = []
      for (const p of persons) if (p) lengths.push(dist(p.world[LM[a]], p.world[LM[b]]))
      if (lengths.length < 2) continue
      const cv = robustCv(lengths)
      if (cv > worstCv) {
        worstCv = cv
        worstBone = name
      }
    }

    // b) Jumps between consecutive frames that contain a person.
    const jump = frames.map(() => false)
    let prev: PoseSample | null = null
    for (let i = 0; i < persons.length; i++) {
      const p = persons[i]
      if (!p) continue
      if (prev && JUMP_JOINTS.some((n) => dist(p.world[LM[n]], prev!.world[LM[n]]) > maxJumpM)) jump[i] = true
      prev = p
    }
    const jumps = jump.filter(Boolean).length

    const ok = worstCv <= maxBoneCv && jumps <= maxJumpFrames
    const detail = `${jumps} jump frames; worst bone ${worstBone} (cv ${(100 * worstCv).toFixed(1)}%)`
    return { ...decide('stability', ok, worstCv, maxBoneCv, 'cv', detail), spans: spansOf(frames, jump) }
  },
}
