/**
 * stability: did the tracker follow the body without glitches?        >>> Felix implements <<<
 *
 * Why: bones do not change length. If the measured thigh suddenly gets 20% longer, or a
 * knee jumps 30 cm between two frames, the tracker lost the joint or swapped left and right.
 * About 10% of OpenPose joint errors were above 40 mm because of such failures
 * (Nakano et al. 2020). A score computed through a glitch is not trustworthy.
 *
 * Two signals, both in world coordinates (metres):
 *   a) bone length: for every bone in RIGID_BONES (../pose/landmarks), the length per frame;
 *      cv = robustCv(lengths). Worst bone = max cv.
 *   b) jumps: per frame, displacement of knees and ankles since the previous frame with a
 *      person; count frames where it exceeds cfg.maxJumpM.
 *
 * TODO
 *   1. compute both signals (helpers: track, dist, robustCv from ./util).
 *   2. ok = worstCv <= cfg.maxBoneCv && jumps === 0   (or allow a small number of jumps;
 *      decide on real data and document it).
 *   3. return decide('stability', ok, worstCv, cfg.maxBoneCv, 'cv', `${jumps} jumps; worst bone ${name}`).
 *
 * Pitfall: world coordinates are centred on the hip midpoint every frame, so a glitch in
 * one hip also moves every other point. Prefer distances (bone lengths) over positions.
 *
 * Config: config.stability.maxBoneCv, maxJumpM
 * Test: SYNTHETIC_CASES.TRACKING_UNSTABLE must fail.
 */
import { todo } from './result'
import type { CheckDef } from './types'

export const stability: CheckDef = {
  id: 'stability',
  reason: 'TRACKING_UNSTABLE',
  label: 'Tracking stable',
  feedback: 'Wear fitted clothes and make sure the room is evenly lit, then try again.',
  live: false,
  run(_frames, _ctx) {
    return todo('stability')
  },
}
