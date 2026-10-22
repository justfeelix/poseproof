/**
 * Small helpers for writing checks: picking the tracked person, pulling a landmark over
 * time, vector maths and robust statistics. Pure functions, no browser APIs, so checks run
 * the same in the app, in vitest and in the Node evaluation script.
 */
import { LM, type LandmarkName } from '../pose/landmarks'
import type { Point4, PoseSample } from '../pose/types'
import type { Frame } from '../trial/types'

export type Vec3 = [number, number, number]

// ---------------------------------------------------------------- persons and series

/** Area of the bounding box of a pose in image coordinates. */
export function boxArea(p: PoseSample): number {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of p.image) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
  }
  return Math.max(0, x1 - x0) * Math.max(0, y1 - y0)
}

/** Horizontal distance of a person's hip midpoint from the image centre. */
export function offCentre(p: PoseSample): number {
  return Math.abs((p.image[LM.left_hip][0] + p.image[LM.right_hip][0]) / 2 - 0.5)
}

/**
 * The person being tested, or null. The tested person stands in front of the camera, so
 * take the one closest to the horizontal image centre.
 * Not "the largest box": while the tester squats, a person standing behind them can have a
 * taller box, and the tracked person would switch mid-rep.
 */
export function primaryPose(frame: Frame): PoseSample | null {
  if (frame.poses.length === 0) return null
  let best = frame.poses[0]
  for (const p of frame.poses) if (offCentre(p) < offCentre(best)) best = p
  return best
}

/** One landmark of the primary person over time; null where nobody was detected. */
export function track(frames: Frame[], name: LandmarkName, space: 'world' | 'image' = 'world'): (Point4 | null)[] {
  const i = LM[name]
  return frames.map((f) => {
    const p = primaryPose(f)
    return p ? p[space][i] : null
  })
}

/** Frame times in seconds. */
export function seconds(frames: Frame[]): number[] {
  return frames.map((f) => f.t / 1000)
}

/** Drop nulls but keep the matching times, e.g. for plotting or fitting. */
export function compact<T>(values: (T | null)[], times: number[]): { values: T[]; times: number[] } {
  const v: T[] = []
  const t: number[] = []
  values.forEach((x, k) => {
    if (x !== null) {
      v.push(x)
      t.push(times[k])
    }
  })
  return { values: v, times: t }
}

// ---------------------------------------------------------------- vectors

export const xyz = (p: Point4 | Vec3): Vec3 => [p[0], p[1], p[2]]
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
export const norm = (a: Vec3): number => Math.hypot(a[0], a[1], a[2])
export const dist = (a: Point4 | Vec3, b: Point4 | Vec3): number => norm(sub(xyz(a), xyz(b)))
export const midpoint = (a: Point4 | Vec3, b: Point4 | Vec3): Vec3 => scale(add(xyz(a), xyz(b)), 0.5)

/** Angle between two vectors in degrees (0..180). */
export function angleBetweenDeg(u: Vec3, v: Vec3): number {
  const c = dot(u, v) / (norm(u) * norm(v))
  return (Math.acos(Math.min(1, Math.max(-1, c))) * 180) / Math.PI
}

/** Angle at b in the chain a-b-c, in degrees. A straight knee (hip-knee-ankle) gives 180. */
export function jointAngleDeg(a: Point4 | Vec3, b: Point4 | Vec3, c: Point4 | Vec3): number {
  return angleBetweenDeg(sub(xyz(a), xyz(b)), sub(xyz(c), xyz(b)))
}

// ---------------------------------------------------------------- statistics

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN
}

export function std(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1))
}

export function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const pos = (s.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

export const median = (xs: number[]) => quantile(xs, 0.5)

/** Coefficient of variation with the median as the robust centre. */
export function robustCv(xs: number[]): number {
  const m = median(xs)
  return m === 0 ? NaN : std(xs) / Math.abs(m)
}

/** Centred moving average; the window shrinks at the edges. */
export function movingAverage(xs: number[], window: number): number[] {
  const h = Math.floor(window / 2)
  return xs.map((_, i) => mean(xs.slice(Math.max(0, i - h), Math.min(xs.length, i + h + 1))))
}

/** Share of items for which pred is true (0 for an empty list). */
export function fraction<T>(items: T[], pred: (x: T) => boolean): number {
  return items.length ? items.filter(pred).length / items.length : 0
}
