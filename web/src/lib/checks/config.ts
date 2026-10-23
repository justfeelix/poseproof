/**
 * Thresholds for every check, in one place.
 *
 * The values below are STARTING GUESSES. Tune them on your labelled real trials (GUIDE.md,
 * step 10) and write down in the README what you changed and why. Never tune on the test
 * set you report results on.
 */
export const DEFAULT_CONFIG = {
  framing: {
    /** Landmarks must lie at least this far inside the image border (normalised units). */
    margin: 0.02,
    /** Share of frames in which every required landmark is inside the image. */
    minFrameFraction: 0.95,
  },
  onePerson: {
    /** Share of frames allowed to contain a second person. */
    maxFrameFraction: 0.05,
    /** A detection counts as a person only if its box is at least this share of the tested person's (median) box area. */
    minAreaRatio: 0.25,
  },
  orientation: {
    /** Front test: max angle between the shoulder/hip line and the image plane. */
    frontMaxDeg: 25,
    /** Side test: min angle between the shoulder/hip line and the image plane. */
    sideMinDeg: 60,
  },
  visibility: {
    /** A key joint counts as hidden in a frame when its visibility is below this. */
    minVisibility: 0.6,
    /** Fail when any key joint is hidden in more than this share of frames. */
    maxHiddenFraction: 0.2,
  },
  stability: {
    /** Max coefficient of variation (std / median) of a rigid bone length. */
    maxBoneCv: 0.08,
    /** A frame-to-frame jump of a joint larger than this many metres counts as a glitch. */
    maxJumpM: 0.15,
    /** Frames with such a jump that are tolerated (0 = none). Tune on real trials. */
    maxJumpFrames: 0,
  },
  calmStart: {
    /** Length of the standing baseline at the start of the trial. */
    windowS: 1.5,
    /** Max movement (standard deviation, metres) of the hip height during the baseline. */
    maxHipStdM: 0.02,
  },
  depth: {
    /** Knee flexion (0 = straight) the typical rep (median of the per-rep peaks) must reach. */
    minKneeFlexionDeg: 90,
  },
  heels: {
    /** Max rise of the heel above its standing height. */
    maxLiftM: 0.025,
  },
  tempo: {
    /**
     * Min duration of the way down in every rep, measured from the last moment the person
     * was still near standing height (15% of the squat range) to the bottom of the rep.
     */
    minDescentS: 0.6,
    /** Less vertical range than this (metres) means no reps were done at all. */
    minRangeM: 0.04,
  },
}

export type CheckConfig = typeof DEFAULT_CONFIG
