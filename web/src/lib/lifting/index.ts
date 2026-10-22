/**
 * 2D-to-3D lifting: turn a sequence of 2D keypoints into 3D joint positions.
 *
 * The 3D view can show the output of any lifter, side by side or overlaid, so lifters can
 * be compared on the same trial. Two lifters are planned (see docs/lifting.md):
 *
 *   mediapipe  MediaPipe's own 3D output ("world landmarks"). Available now: the pose model
 *              predicts it together with the 2D points, so it costs nothing extra.
 *   temporal   A small temporal lifting network trained on public motion-capture data,
 *              exported to ONNX and run in the browser. It sees a window of 2D frames and
 *              predicts the 3D pose of the centre frame.            (TODO: train and add)
 *
 * Output convention for every lifter: one entry per frame, null where there is no person;
 * each entry has the 33 MediaPipe joints in metres, camera-aligned axes (x right, y down,
 * z away from the camera), hip midpoint at the origin. Joints a lifter does not predict are
 * NaN, and the viewer skips them.
 */
import type { Frame } from '../trial/types'
import { primaryPose } from '../checks/util'

export type Joint3 = [number, number, number]
export type Lifted = (Joint3[] | null)[]

export interface Lifter {
  id: 'mediapipe' | 'temporal'
  name: string
  /** One-line description for the picker. */
  about: string
  available: boolean
  lift(frames: Frame[]): Promise<Lifted>
}

export const mediapipeLifter: Lifter = {
  id: 'mediapipe',
  name: 'MediaPipe 3D',
  about: 'Predicted by the pose model together with the 2D points.',
  available: true,
  async lift(frames) {
    return frames.map((f) => {
      const p = primaryPose(f)
      return p ? p.world.map(([x, y, z]) => [x, y, z] as Joint3) : null
    })
  },
}

/**
 * Planned: temporal lifter (VideoPose3D-style dilated convolutions over 2D keypoints),
 * trained in analysis/lifting, exported to web/public/models/lifter.onnx and run with
 * onnxruntime-web. See docs/lifting.md for the plan and GUIDE.md for the steps.
 */
export const temporalLifter: Lifter = {
  id: 'temporal',
  name: 'Temporal lifter',
  about: 'Own model trained on motion-capture data. Not trained yet.',
  available: false,
  async lift() {
    throw new Error('the temporal lifter is not trained yet (docs/lifting.md)')
  },
}

export const LIFTERS: Lifter[] = [mediapipeLifter, temporalLifter]
