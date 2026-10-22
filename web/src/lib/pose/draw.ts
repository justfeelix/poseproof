import { CONNECTIONS, isLeft, isRight } from './landmarks'
import type { Point4 } from './types'

// Person's left in signal orange, right in white, centre line in grey.
const LEFT = '#f0640f'
const RIGHT = '#ffffff'
const MID = '#9a9a9a'
const DIM = '#5a5a5a'

export interface DrawStyle {
  minVisibility?: number // points below this are drawn faded
  dim?: boolean // a second person, drawn grey
}

const colorOf = (i: number, dim?: boolean) => (dim ? DIM : isLeft(i) ? LEFT : isRight(i) ? RIGHT : MID)

/** Draw one pose (normalised image coordinates) onto a canvas of size w x h. */
export function drawPose(ctx: CanvasRenderingContext2D, pts: Point4[], w: number, h: number, style: DrawStyle = {}) {
  const minVis = style.minVisibility ?? 0.5
  const lw = Math.max(3, w / 260)
  const r = Math.max(3.5, w / 200)

  ctx.lineCap = 'round'
  for (const [a, b] of CONNECTIONS) {
    if (a <= 10 && b <= 10) continue // face: points only, no wire mesh
    const pa = pts[a]
    const pb = pts[b]
    if (!pa || !pb) continue
    const faded = pa[3] < minVis || pb[3] < minVis
    ctx.globalAlpha = faded ? 0.3 : 1
    const sameSide = (isLeft(a) && isLeft(b)) || (isRight(a) && isRight(b))
    ctx.strokeStyle = sameSide ? colorOf(a, style.dim) : style.dim ? DIM : MID
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(pa[0] * w, pa[1] * h)
    ctx.lineTo(pb[0] * w, pb[1] * h)
    ctx.stroke()
  }
  for (let i = 0; i < pts.length; i++) {
    if (i >= 1 && i <= 10) continue // keep the face quiet: nose only
    const p = pts[i]
    ctx.globalAlpha = p[3] < minVis ? 0.3 : 1
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(p[0] * w, p[1] * h, r + 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = colorOf(i, style.dim)
    ctx.beginPath()
    ctx.arc(p[0] * w, p[1] * h, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
