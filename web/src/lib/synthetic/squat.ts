/**
 * Synthetic squat trials: a simple stick figure with known ground truth.
 *
 * Use it to unit-test the checks (a good trial must pass, a trial with one injected fault
 * must fail with the right reason) and to make demo samples for the replay view. It is NOT
 * a substitute for real recordings: real MediaPipe output is noisier and has failure modes
 * this model does not have. Thresholds must be tuned on real trials.
 *
 * Coordinates follow MediaPipe: world in metres, origin at the hip midpoint, y down,
 * axes aligned with the camera; image normalised to [0, 1], unmirrored, so a person facing
 * the camera has their left side at larger x.
 */
import { LM, NUM_LANDMARKS } from '../pose/landmarks'
import type { Point4, PoseSample } from '../pose/types'
import { TRIAL_SCHEMA, type Frame, type TestKind, type Trial } from '../trial/types'

export interface SquatOptions {
  test?: TestKind
  fps?: number
  durationS?: number
  reps?: number
  startStillS?: number // standing still before the first rep
  descentS?: number // time to go down
  bottomS?: number // pause at the bottom
  ascentS?: number // time to come up
  restS?: number // standing between reps
  kneeFlexionDeg?: number // peak knee flexion at the bottom (0 = straight leg)
  heelLiftM?: number // heel lift at the bottom, metres
  yawDeg?: number // extra body rotation about the vertical axis
  shiftX?: number // move the person in the image (normalised units)
  shiftY?: number
  noiseM?: number // Gaussian noise on world points, metres
  glitchFrames?: number // frames where one knee jumps (tracking failure)
  secondPersonFrom?: number // seconds; a second person stands in the frame from then on
  dropoutFrames?: number // frames with no person detected
  seed?: number
}

const DEFAULTS: Required<SquatOptions> = {
  test: 'squat_front',
  fps: 30,
  durationS: 14,
  reps: 3,
  startStillS: 2.5,
  descentS: 1.4,
  bottomS: 0.3,
  ascentS: 1.2,
  restS: 0.8,
  kneeFlexionDeg: 105,
  heelLiftM: 0,
  yawDeg: 0,
  shiftX: 0,
  shiftY: 0,
  noiseM: 0.004,
  glitchFrames: 0,
  secondPersonFrom: -1,
  dropoutFrames: 0,
  seed: 1,
}

// Body dimensions in metres (adult, roughly 1.80 m tall).
const BODY = {
  ankleHeight: 0.08,
  shank: 0.43,
  thigh: 0.45,
  torso: 0.52,
  hipHalfWidth: 0.15,
  shoulderHalfWidth: 0.2,
  upperArm: 0.3,
  forearm: 0.27,
  heelBack: 0.06,
  toeForward: 0.17,
}

// Virtual camera: 3 m away, 1.0 m high, about 70 degrees horizontal field of view, 16:9.
const CAM = { width: 1280, height: 720, viewWidthM: 4.2, viewHeightM: 2.36, heightM: 1.0 }

/** Deterministic random numbers so tests are reproducible. */
function rng(seed: number) {
  let a = seed >>> 0
  const uniform = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const gauss = () => Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(2 * Math.PI * uniform())
  return { uniform, gauss }
}

const smooth = (x: number) => x * x * (3 - 2 * x) // ease in and out, 0..1

/** Squat progress 0 (standing) .. 1 (bottom) at time t. */
export function squatPhase(t: number, o: Required<SquatOptions>): number {
  let s = t - o.startStillS
  if (s < 0) return 0
  const cycle = o.descentS + o.bottomS + o.ascentS + o.restS
  const rep = Math.floor(s / cycle)
  if (rep >= o.reps) return 0
  s -= rep * cycle
  if (s < o.descentS) return smooth(s / o.descentS)
  s -= o.descentS
  if (s < o.bottomS) return 1
  s -= o.bottomS
  if (s < o.ascentS) return 1 - smooth(s / o.ascentS)
  return 0
}

type Vec3 = [number, number, number] // lateral (person's left +), up, forward

/** Body-frame landmark positions (floor at up = 0) for squat progress p. */
function bodyPose(p: number, o: Required<SquatOptions>): Vec3[] {
  const k = ((o.kneeFlexionDeg * Math.PI) / 180) * p // knee flexion
  const sh = 0.45 * k // shank tilts forward
  const th = k - sh // thigh tilts back relative to vertical
  const tr = 0.75 * sh // trunk leans forward
  const lift = o.heelLiftM * p

  const pts: Vec3[] = Array.from({ length: NUM_LANDMARKS }, () => [0, 0, 0])
  for (const side of [1, -1] as const) {
    const L = side === 1 // person's left
    const ankle: Vec3 = [side * BODY.hipHalfWidth, BODY.ankleHeight + 0.8 * lift, 0]
    const knee: Vec3 = [ankle[0], ankle[1] + BODY.shank * Math.cos(sh), ankle[2] + BODY.shank * Math.sin(sh)]
    const hip: Vec3 = [ankle[0], knee[1] + BODY.thigh * Math.cos(th), knee[2] - BODY.thigh * Math.sin(th)]
    const shoulder: Vec3 = [
      side * BODY.shoulderHalfWidth,
      hip[1] + BODY.torso * Math.cos(tr),
      hip[2] + BODY.torso * Math.sin(tr),
    ]
    const elbow: Vec3 = [shoulder[0], shoulder[1] - 0.02, shoulder[2] + BODY.upperArm]
    const wrist: Vec3 = [shoulder[0], shoulder[1] - 0.04, elbow[2] + BODY.forearm]
    const heel: Vec3 = [ankle[0], 0.02 + lift, ankle[2] - BODY.heelBack]
    const toe: Vec3 = [ankle[0], 0.02, ankle[2] + BODY.toeForward]
    const set = (name: string, v: Vec3) => (pts[LM[name as keyof typeof LM]] = v)
    const s = L ? 'left' : 'right'
    set(`${s}_ankle`, ankle)
    set(`${s}_knee`, knee)
    set(`${s}_hip`, hip)
    set(`${s}_shoulder`, shoulder)
    set(`${s}_elbow`, elbow)
    set(`${s}_wrist`, wrist)
    set(`${s}_pinky`, [wrist[0] + side * 0.02, wrist[1], wrist[2] + 0.07])
    set(`${s}_index`, [wrist[0], wrist[1], wrist[2] + 0.08])
    set(`${s}_thumb`, [wrist[0] - side * 0.02, wrist[1] + 0.02, wrist[2] + 0.05])
    set(`${s}_heel`, heel)
    set(`${s}_foot_index`, toe)
  }
  const ls = pts[LM.left_shoulder]
  const rs = pts[LM.right_shoulder]
  const neck: Vec3 = [(ls[0] + rs[0]) / 2, (ls[1] + rs[1]) / 2, (ls[2] + rs[2]) / 2]
  const nose: Vec3 = [neck[0], neck[1] + 0.22, neck[2] + 0.1]
  pts[LM.nose] = nose
  for (const side of [1, -1] as const) {
    const s = side === 1 ? 'left' : 'right'
    const at = (dx: number, du: number, df: number): Vec3 => [nose[0] + side * dx, nose[1] + du, nose[2] + df]
    pts[LM[`${s}_eye_inner` as keyof typeof LM]] = at(0.015, 0.035, -0.01)
    pts[LM[`${s}_eye` as keyof typeof LM]] = at(0.032, 0.037, -0.015)
    pts[LM[`${s}_eye_outer` as keyof typeof LM]] = at(0.048, 0.035, -0.02)
    pts[LM[`${s}_ear` as keyof typeof LM]] = at(0.075, 0.01, -0.09)
    pts[LM[`mouth_${s}` as keyof typeof LM]] = at(0.025, -0.04, -0.005)
  }
  return pts
}

/** Project body-frame points into one MediaPipe-style PoseSample. */
function toSample(body: Vec3[], o: Required<SquatOptions>, noise: () => number, offsetLatM = 0): PoseSample {
  const baseYaw = o.test === 'squat_side' ? 90 : 0
  const yaw = ((baseYaw + o.yawDeg) * Math.PI) / 180
  const lh = body[LM.left_hip]
  const rh = body[LM.right_hip]
  const mid: Vec3 = [(lh[0] + rh[0]) / 2, (lh[1] + rh[1]) / 2, (lh[2] + rh[2]) / 2]

  const image: Point4[] = []
  const world: Point4[] = []
  for (const [lat, up, fwd] of body) {
    // camera-aligned: x right in the unmirrored image, y down, z away from the camera
    const x = lat * Math.cos(yaw) + fwd * Math.sin(yaw) + offsetLatM
    const z = lat * Math.sin(yaw) - fwd * Math.cos(yaw)
    const mx = mid[0] * Math.cos(yaw) + mid[2] * Math.sin(yaw) + offsetLatM
    const mz = mid[0] * Math.sin(yaw) - mid[2] * Math.cos(yaw)
    const wx = x - mx + noise()
    const wy = -(up - mid[1]) + noise()
    const wz = z - mz + noise()
    // joints on the far side of the body are harder to see
    const vis = z > 0.08 ? 0.55 : 0.97
    world.push([wx, wy, wz, vis])
    image.push([
      0.5 + o.shiftX + x / CAM.viewWidthM,
      0.5 + o.shiftY + (CAM.heightM - up) / CAM.viewHeightM,
      z / CAM.viewWidthM,
      vis,
    ])
  }
  return { image, world }
}

export function syntheticSquat(options: SquatOptions = {}): Trial {
  const o: Required<SquatOptions> = { ...DEFAULTS, ...options }
  const r = rng(o.seed)
  const noise = () => o.noiseM * r.gauss()
  const n = Math.round(o.durationS * o.fps)

  const glitch = new Set<number>()
  while (glitch.size < Math.min(o.glitchFrames, n)) glitch.add(Math.floor(r.uniform() * n))
  const dropout = new Set<number>()
  while (dropout.size < Math.min(o.dropoutFrames, n)) dropout.add(Math.floor(r.uniform() * n))

  const frames: Frame[] = []
  for (let i = 0; i < n; i++) {
    const t = i / o.fps
    if (dropout.has(i)) {
      frames.push({ t: Math.round(t * 10000) / 10, poses: [] })
      continue
    }
    const body = bodyPose(squatPhase(t, o), o)
    if (glitch.has(i)) {
      const k = body[LM.left_knee]
      body[LM.left_knee] = [k[0] + 0.25, k[1] - 0.15, k[2]]
    }
    const poses = [toSample(body, o, noise)]
    if (o.secondPersonFrom >= 0 && t >= o.secondPersonFrom) {
      poses.push(toSample(bodyPose(0, o), o, noise, 1.3))
    }
    frames.push({ t: Math.round(t * 10000) / 10, poses })
  }

  return {
    schema: TRIAL_SCHEMA,
    id: `synthetic_seed${o.seed}_${o.test}`,
    test: o.test,
    createdAt: '2026-01-01T00:00:00.000Z',
    source: 'video',
    model: 'synthetic',
    image: { width: CAM.width, height: CAM.height },
    mirrored: false,
    frames,
    note: 'synthetic stick figure, see src/lib/synthetic/squat.ts',
  }
}

/** One synthetic trial per fault, plus a clean one. Keys are the expected reason codes. */
export const SYNTHETIC_CASES: Record<string, SquatOptions> = {
  CLEAN: {},
  OUT_OF_FRAME: { shiftY: 0.12 }, // feet below the image edge
  MULTI_PERSON: { secondPersonFrom: 5 },
  WRONG_ORIENTATION: { yawDeg: 40 },
  TRACKING_UNSTABLE: { glitchFrames: 25 },
  NO_CALM_START: { startStillS: 0 },
  DEPTH_NOT_REACHED: { kneeFlexionDeg: 45 },
  HEEL_LIFT: { heelLiftM: 0.05 },
  TOO_FAST: { descentS: 0.35, ascentS: 0.35, bottomS: 0 },
}
