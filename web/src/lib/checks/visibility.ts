/**
 * visibility: are the joints we measure actually visible?            >>> Felix implements <<<
 *
 * Why: joints hidden behind the body are guessed by the model. Depth cameras like the Azure
 * Kinect show the same problem: the hip angle on the side hidden from the camera had poor
 * validity (Jo et al. 2022, Sensors). A score computed from guessed joints should not count.
 *
 * Key joints: hips, knees, ankles, heels.
 *   squat_front: both sides.
 *   squat_side:  only the side closer to the camera (the one with the higher median
 *                visibility); the far side is expected to be hidden.
 *
 * TODO
 *   1. choose the key joints for ctx.test (see above).
 *   2. for each key joint: hidden = fraction of frames where visibility (point[3]) <
 *      cfg.minVisibility. Frames without a person count as hidden.
 *   3. worst = the joint with the largest hidden share.
 *   4. return decide('visibility', worst <= cfg.maxHiddenFraction, worst,
 *      cfg.maxHiddenFraction, 'share of frames', `${name} hidden in ...%`).
 *
 * Config: config.visibility.minVisibility, maxHiddenFraction
 * Test: CLEAN front and CLEAN side (test: 'squat_side') must both pass. There is no
 * synthetic fault for this one; record real trials with a leg hidden (e.g. a bag in front).
 */
import { todo } from './result'
import type { CheckDef } from './types'

export const visibility: CheckDef = {
  id: 'visibility',
  reason: 'JOINT_HIDDEN',
  label: 'Legs clearly visible',
  feedback: 'Make sure nothing blocks the camera’s view of your legs and feet.',
  live: true,
  run(_frames, _ctx) {
    return todo('visibility')
  },
}
