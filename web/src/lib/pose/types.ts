/** One landmark: x, y, z, visibility.
 *  image: x, y normalised to [0, 1] by image width / height (can lie outside when the point is
 *         extrapolated off-screen); z is relative depth, roughly in the same scale as x.
 *  world: metres, origin at the hip midpoint, y points down (MediaPipe convention).
 *  visibility: 0..1, how likely the point is visible (not occluded) in the image. */
export type Point4 = [number, number, number, number]

/** Landmarks of one detected person in one frame. */
export interface PoseSample {
  image: Point4[] // 33 entries
  world: Point4[] // 33 entries
}

/** What the camera component reports with every frame. */
export interface FrameContext {
  width: number
  height: number
  mirrored: boolean
  model: string // e.g. "full/GPU"
}

const round =(v: number, digits: number) => {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

interface LandmarkLike {
  x: number
  y: number
  z: number
  visibility?: number
}

function toPoint4(lm: LandmarkLike, digits: number): Point4 {
  return [round(lm.x, digits), round(lm.y, digits), round(lm.z, digits), round(lm.visibility ?? 0, 3)]
}

/** Convert a PoseLandmarkerResult into our compact format (rounded to keep files small). */
export function posesFromResult(result: { landmarks: LandmarkLike[][]; worldLandmarks: LandmarkLike[][] }): PoseSample[] {
  return result.landmarks.map((image, k) => ({
    image: image.map((lm) => toPoint4(lm, 4)),
    world: (result.worldLandmarks[k] ?? []).map((lm) => toPoint4(lm, 4)),
  }))
}
