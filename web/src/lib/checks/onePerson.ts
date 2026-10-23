/**
 * one_person: is only the tested person in the picture?
 *
 * Why: with two people the tracker can jump to the wrong one mid-test, and in a gym someone
 * walking past is common. The detector runs with numPoses = 2 so a second person shows up
 * as frame.poses[1].
 *
 * Method (same three steps as framing):
 *   1. Reference size: the median box area of the tested person over the whole trial.
 *      primaryPose() picks the tested person (closest to the image centre, see util.ts).
 *      A fixed reference is used instead of "the primary's box in this frame" because that
 *      box shrinks at the bottom of a squat, which would let small bystanders slip through.
 *   2. Per frame: is there another detection that is "real", i.e. at least
 *      config.onePerson.minAreaRatio times as large as the reference? Tiny detections far
 *      in the background (or a poster, a reflection at a distance) are ignored.
 *   3. share = fraction of frames with a real second person; pass if share is at most
 *      config.onePerson.maxFrameFraction. A single flickering frame does not fail the trial.
 *
 * Limits (for the README): a mirror reflection or a photo of a person looks like a second
 * person; a bystander far behind the tester is ignored by design; a second person who
 * stands exactly where the tested person stands is not detected as a second pose.
 */
import { decide } from './result'
import type { CheckDef } from './types'
import { boxArea, fraction, median, primaryPose, spansOf } from './util'

export const onePerson: CheckDef = {
  id: 'one_person',
  reason: 'MULTI_PERSON',
  label: 'Only you in the picture',
  feedback: 'Make sure nobody else is in front of the camera during the test.',
  live: true,
  run(frames, { config }) {
    const { maxFrameFraction, minAreaRatio } = config.onePerson

    // 1. Reference size of the tested person (NaN if nobody was ever detected).
    const sizes: number[] = []
    for (const frame of frames) {
      const main = primaryPose(frame)
      if (main) sizes.push(boxArea(main))
    }
    const refArea = median(sizes)

    // 2. One flag per frame: is a real second person there?
    const hasSecond = frames.map((frame) => {
      const main = primaryPose(frame)
      if (!main) return false
      return frame.poses.some((p) => p !== main && boxArea(p) >= minAreaRatio * refArea)
    })

    // 3. Reduce to one number and decide.
    const share = fraction(hasSecond, (flag) => flag)
    const first = hasSecond.indexOf(true)
    const detail =
      first >= 0
        ? `second person from ${(frames[first].t / 1000).toFixed(1)} s, in ${Math.round(100 * share)}% of frames`
        : undefined

    return {
      ...decide('one_person', share <= maxFrameFraction, share, maxFrameFraction, 'share of frames', detail),
      spans: spansOf(frames, hasSecond),
    }
  },
}
