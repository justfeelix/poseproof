/**
 * Interactive 3D view of a skeleton on a lifting platform (three.js).
 * Loaded lazily, so the 2D app stays light when the 3D view is never opened.
 *
 * Input poses use the lifting convention (lib/lifting): metres, x right, y down, z away
 * from the camera. three.js uses y up and the camera on +z, so (x, y, z) -> (x, -y, -z).
 * Each frame is shifted so the lowest foot point touches the floor: the hips then really
 * go down during a squat instead of the floor coming up.
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CONNECTIONS, LM, isLeft, isRight } from '../pose/landmarks'
import type { Joint3 } from '../lifting'

export type ViewPreset = 'front' | 'side' | 'top' | 'free'

const COLORS = { left: 0xf0640f, right: 0xf2f2f2, mid: 0x8c8c8c, ghost: 0x6aa9ff }
const BONES = CONNECTIONS.filter(([a, b]) => a > 10 && b > 10)
const JOINTS = Array.from({ length: 33 }, (_, i) => i).filter((i) => i > 10)
const FEET = [LM.left_heel, LM.right_heel, LM.left_foot_index, LM.right_foot_index, LM.left_ankle, LM.right_ankle]
const TARGET = new THREE.Vector3(0, 0.9, 0)

const PRESETS: Record<Exclude<ViewPreset, 'free'>, THREE.Vector3> = {
  front: new THREE.Vector3(0, 1.2, 4.9),
  side: new THREE.Vector3(4.9, 1.2, 0),
  top: new THREE.Vector3(0, 5.2, 0.6),
}

const UP = new THREE.Vector3(0, 1, 0)

class Figure {
  group = new THREE.Group()
  private bones: THREE.Mesh[] = []
  private joints = new Map<number, THREE.Mesh>()
  private head: THREE.Mesh
  private neck: THREE.Mesh

  constructor(ghost: boolean) {
    const mat = (c: number) =>
      ghost
        ? new THREE.MeshBasicMaterial({ color: COLORS.ghost, transparent: true, opacity: 0.55 })
        : new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.05 })
    const side = (i: number) => (isLeft(i) ? COLORS.left : isRight(i) ? COLORS.right : COLORS.mid)
    const boneGeo = new THREE.CylinderGeometry(ghost ? 0.014 : 0.022, ghost ? 0.014 : 0.022, 1, 12)
    const jointGeo = new THREE.SphereGeometry(ghost ? 0.022 : 0.032, 16, 12)
    for (const [a, b] of BONES) {
      const same = (isLeft(a) && isLeft(b)) || (isRight(a) && isRight(b))
      const m = new THREE.Mesh(boneGeo, mat(same ? side(a) : COLORS.mid))
      m.castShadow = !ghost
      this.bones.push(m)
      this.group.add(m)
    }
    for (const i of JOINTS) {
      const m = new THREE.Mesh(jointGeo, mat(side(i)))
      m.castShadow = !ghost
      this.joints.set(i, m)
      this.group.add(m)
    }
    this.head = new THREE.Mesh(new THREE.SphereGeometry(ghost ? 0.07 : 0.09, 24, 18), mat(COLORS.mid))
    this.head.castShadow = !ghost
    this.neck = new THREE.Mesh(boneGeo, mat(COLORS.mid))
    this.neck.castShadow = !ghost
    this.group.add(this.head, this.neck)
  }

  set(pts: THREE.Vector3[] | null) {
    this.group.visible = !!pts
    if (!pts) return
    BONES.forEach(([a, b], k) => {
      const m = this.bones[k]
      const pa = pts[a]
      const pb = pts[b]
      if (!isFinite(pa.x) || !isFinite(pb.x)) {
        m.visible = false
        return
      }
      const dir = new THREE.Vector3().subVectors(pb, pa)
      const len = dir.length()
      m.visible = len > 1e-4
      m.position.copy(pa).addScaledVector(dir, 0.5)
      m.scale.set(1, len, 1)
      m.quaternion.setFromUnitVectors(UP, dir.normalize())
    })
    for (const [i, m] of this.joints) {
      m.visible = isFinite(pts[i].x)
      if (m.visible) m.position.copy(pts[i])
    }
    // head between the ears, neck from the shoulder midpoint to the head
    const le = pts[LM.left_ear]
    const re = pts[LM.right_ear]
    const ls = pts[LM.left_shoulder]
    const rs = pts[LM.right_shoulder]
    const ok = [le, re, ls, rs].every((p) => p && isFinite(p.x))
    this.head.visible = this.neck.visible = ok
    if (!ok) return
    this.head.position.copy(le).add(re).multiplyScalar(0.5)
    const base = ls.clone().add(rs).multiplyScalar(0.5)
    const dir = new THREE.Vector3().subVectors(this.head.position, base)
    const len = Math.max(0, dir.length() - 0.08)
    this.neck.position.copy(base).addScaledVector(dir.clone().normalize(), len / 2)
    this.neck.scale.set(1, len, 1)
    this.neck.quaternion.setFromUnitVectors(UP, dir.normalize())
  }
}

/** Convert one lifted pose to three.js coordinates, standing on the floor. */
export function toScene(pose: Joint3[], floorOffset?: number): { pts: THREE.Vector3[]; offset: number } {
  const pts = pose.map(([x, y, z]) => new THREE.Vector3(x, -y, -z))
  let minY = Infinity
  for (const i of FEET) if (isFinite(pts[i]?.y)) minY = Math.min(minY, pts[i].y)
  const offset = floorOffset ?? (isFinite(minY) ? -minY : 0.95)
  for (const p of pts) p.y += offset
  return { pts, offset }
}

export class SkeletonScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.05, 50)
  private controls: OrbitControls
  private main = new Figure(false)
  private ghost = new Figure(true)
  private trail: THREE.Line
  private goal: THREE.Vector3 | null = null
  private raf = 0
  private resize: ResizeObserver
  onUserOrbit?: () => void

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setClearColor(0x000000)
    host.appendChild(this.renderer.domElement)

    this.scene.fog = new THREE.Fog(0x000000, 7, 16)
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 1.6))
    const sun = new THREE.DirectionalLight(0xffffff, 2.2)
    sun.position.set(1.5, 4, 2.5)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -2
    sun.shadow.camera.right = 2
    sun.shadow.camera.top = 2
    sun.shadow.camera.bottom = -2
    sun.shadow.radius = 4
    this.scene.add(sun)

    // Platform: 2.5 m square like a lifting platform, grid every 50 cm, orange edge.
    const plat = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 }))
    plat.rotation.x = -Math.PI / 2
    plat.receiveShadow = true
    this.scene.add(plat)
    const grid = new THREE.GridHelper(2.5, 5, 0x3a3a3a, 0x2a2a2a)
    grid.position.y = 0.001
    this.scene.add(grid)
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.5, 2.5)),
      new THREE.LineBasicMaterial({ color: COLORS.left }),
    )
    edge.rotation.x = -Math.PI / 2
    edge.position.y = 0.002
    this.scene.add(edge)
    // camera marker: where the real camera stood (front of the platform)
    const cam = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 4), new THREE.MeshBasicMaterial({ color: 0x5a5a5a }))
    cam.rotation.x = -Math.PI / 2
    cam.position.set(0, 0.05, 1.55)
    this.scene.add(cam)

    this.scene.add(this.main.group, this.ghost.group)
    this.ghost.group.visible = false

    this.trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: COLORS.left, transparent: true, opacity: 0.8 }))
    this.trail.visible = false
    this.scene.add(this.trail)

    this.camera.position.copy(PRESETS.front)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.copy(TARGET)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 1.4
    this.controls.maxDistance = 10
    this.controls.maxPolarAngle = Math.PI * 0.495
    this.controls.addEventListener('start', () => {
      this.goal = null
      this.onUserOrbit?.()
    })

    this.resize = new ResizeObserver(() => this.fit())
    this.resize.observe(host)
    this.fit()
    const loop = () => {
      if (this.goal) {
        this.camera.position.lerp(this.goal, 0.14)
        if (this.camera.position.distanceTo(this.goal) < 0.01) this.goal = null
      }
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
      this.raf = requestAnimationFrame(loop)
    }
    loop()
  }

  private fit() {
    const w = this.host.clientWidth
    const h = this.host.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  view(preset: ViewPreset) {
    if (preset === 'free') return
    this.controls.target.copy(TARGET)
    this.goal = PRESETS[preset].clone()
  }

  setPose(main: Joint3[] | null, ghost: Joint3[] | null = null) {
    const m = main ? toScene(main) : null
    this.main.set(m?.pts ?? null)
    // the ghost shares the main figure's floor offset, so both stand on the same root
    this.ghost.set(ghost ? toScene(ghost, m?.offset).pts : null)
  }

  /** Path of the hip midpoint over the whole trial (scene coordinates). */
  setTrail(points: [number, number, number][] | null) {
    this.trail.visible = !!points && points.length > 1
    if (!points) return
    this.trail.geometry.dispose()
    this.trail.geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.resize.disconnect()
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}

/** Hip-midpoint path for the trail, using each frame's own floor offset. */
export function hipTrail(poses: (Joint3[] | null)[]): [number, number, number][] {
  const out: [number, number, number][] = []
  for (const p of poses) {
    if (!p) continue
    const { pts } = toScene(p)
    const h = pts[LM.left_hip].clone().add(pts[LM.right_hip]).multiplyScalar(0.5)
    out.push([h.x, h.y, h.z])
  }
  return out
}
