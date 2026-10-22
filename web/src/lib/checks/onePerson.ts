/**
 * one_person: is only the tested person in the picture?   (TODO: implement)
 *
 * Why: with two people the tracker can jump to the wrong one mid-test, and in a gym someone
 * walking past is common. The detector runs with numPoses = 2 so a second person shows up
 * as frame.poses[1].
 *
 * Note: primaryPose() picks the person closest to the image centre, so the tested person
 * stays the tracked one even when a bystander appears (see util.ts for why not the
 * largest box).
 *
 * TODO
 *   1. For each frame, count persons that are "real": ignore tiny detections far in the
 *      background, e.g. boxArea(p) < 0.25 * boxArea(primaryPose(frame)).
 *   2. share = fraction(frames, f => realPersons(f) >= 2)
 *   3. return decide('one_person', share <= cfg.maxFrameFraction, share, cfg.maxFrameFraction,
 *      'share of frames', <optional detail, e.g. first time a second person appears>)
 *
 * Config: config.onePerson.maxFrameFraction
 * Test: SYNTHETIC_CASES.MULTI_PERSON must fail, CLEAN must pass (checks.test.ts).
 * Helpers: primaryPose, boxArea, fraction from ./util
 */
import { todo } from './result'
import type { CheckDef } from './types'

export const onePerson: CheckDef = {
  id: 'one_person',
  reason: 'MULTI_PERSON',
  label: 'Only you in the picture',
  feedback: 'Make sure nobody else is in front of the camera during the test.',
  live: true,
  run(_frames, _ctx) {
    return todo('one_person')
  },
}
