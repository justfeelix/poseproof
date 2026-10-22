import { CONNECTIONS, isLeft, isRight } from './landmarks'
import type { Point4 } from './types'

const COLOR_LEFT = '#f97316' // person's left: orange
const COLOR_RIGHT = '#0ea5e9' // person's right: blue
const COLOR_MID = '#e5e7eb'

export interface DrawStyle {
  minVisibility?: number // points below this are drawn faded
  lineWidth?: number
  radius?: number
  dim?: boolean // second person, drawn grey
}

/** Draw one pose (image coordinates, normalised) onto a canvas of size w x h. */
export function drawPose(ctx: CanvasRenderingContext2D, pts: Point4[], w: number, h: number, style: DrawStyle = {}) {
  const minVis = style.minVisibility ?? 0.5
  const lw = style.lineWidth ?? Math.max(2, w / 320)
  const r = style.radius ?? Math.max(3, w / 220)

  const colorOf = (i: number) => (style.dim ? '#9ca3af' : isLeft(i) ? COLOR_LEFT : isRight(i) ? COLOR_RIGHT : COLOR_MID)

  ctx.lineCap = 'round'
  for (const [a, b] of CONNECTIONS) {
    const pa = pts[a]
    const pb = pts[b]
    if (!pa || !pb) continue
    const faded = pa[3] < minVis || pb[3] < minVis
    ctx.globalAlpha = faded ? 0.25 : 0.95
    ctx.strokeStyle = isLeft(a) && isLeft(b) ? colorOf(a) : isRight(a) && isRight(b) ? colorOf(a) : style.dim ? '#9ca3af' : COLOR_MID
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(pa[0] * w, pa[1] * h)
    ctx.lineTo(pb[0] * w, pb[1] * h)
    ctx.stroke()
  }
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    ctx.globalAlpha = p[3] < minVis ? 0.25 : 1
    ctx.fillStyle = colorOf(i)
    ctx.beginPath()
    ctx.arc(p[0] * w, p[1] * h, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
