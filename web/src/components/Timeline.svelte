<script lang="ts">
  import { onMount } from 'svelte'
  import type { Series } from '../lib/viz/signals'
  import { valueAt } from '../lib/viz/signals'

  interface Props {
    series: Series
    durationMs: number
    tMs: number
    /** Problem stretches to draw as red bands. */
    spans?: { id: string; label: string; spans: [number, number][] }[]
    onseek: (ms: number) => void
  }
  let { series, durationMs, tMs, spans = [], onseek }: Props = $props()

  let canvas: HTMLCanvasElement
  let box: HTMLDivElement
  let w = $state(800)
  const H = 112
  let hover = $state<number | null>(null)
  let dragging = false

  const knee = $derived(valueAt(series, series.knee, hover ?? tMs))
  const hip = $derived(valueAt(series, series.hip, hover ?? tMs))
  const hipRange = $derived.by(() => {
    const v = series.hip.filter((x): x is number => x !== null)
    return v.length ? [Math.min(...v), Math.max(...v)] : [0, 1]
  })

  const x = (ms: number) => (durationMs ? (ms / durationMs) * w : 0)

  function draw() {
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = w * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, H)

    // problem bands
    for (const s of spans) {
      for (const [a, b] of s.spans) {
        ctx.fillStyle = 'rgba(227, 38, 43, 0.22)'
        ctx.fillRect(x(a), 0, Math.max(2, x(b) - x(a)), H)
        ctx.fillStyle = '#e3262b'
        ctx.fillRect(x(a), 0, Math.max(2, x(b) - x(a)), 3)
      }
    }
    // seconds grid
    ctx.fillStyle = '#2a2a2a'
    for (let s = 0; s <= durationMs; s += 1000) ctx.fillRect(Math.round(x(s)), H - (s % 5000 === 0 ? 10 : 5), 1, 10)

    const line = (vals: (number | null)[], y: (v: number) => number, color: string, width: number) => {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.lineJoin = 'round'
      ctx.beginPath()
      let pen = false
      vals.forEach((v, i) => {
        if (v === null) {
          pen = false
          return
        }
        const px = x(series.t[i])
        if (pen) ctx.lineTo(px, y(v))
        else ctx.moveTo(px, y(v))
        pen = true
      })
      ctx.stroke()
    }
    const pad = 12
    const [h0, h1] = hipRange
    line(series.hip, (v) => H - pad - ((v - h0) / Math.max(1e-6, h1 - h0)) * (H - 2 * pad), '#6b6b6b', 1.5)
    line(series.knee, (v) => H - pad - (Math.min(150, Math.max(0, v)) / 150) * (H - 2 * pad), '#f0640f', 2.25)

    // playhead and hover
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(Math.round(x(tMs)) - 1, 0, 2, H)
    if (hover !== null) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillRect(Math.round(x(hover)), 0, 1, H)
    }
  }

  $effect(() => {
    void [series, durationMs, tMs, spans, hover, w]
    draw()
  })

  onMount(() => {
    const ro = new ResizeObserver(() => (w = box.clientWidth))
    ro.observe(box)
    return () => ro.disconnect()
  })

  const msAt = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    return Math.max(0, Math.min(durationMs, ((e.clientX - r.left) / r.width) * durationMs))
  }
</script>

<div class="tl" bind:this={box}>
  <canvas
    bind:this={canvas}
    style="height: {H}px"
    role="slider"
    tabindex="0"
    aria-label="Trial timeline"
    aria-valuemin={0}
    aria-valuemax={durationMs}
    aria-valuenow={Math.round(tMs)}
    onpointerdown={(e) => {
      dragging = true
      canvas.setPointerCapture(e.pointerId)
      onseek(msAt(e))
    }}
    onpointermove={(e) => {
      hover = msAt(e)
      if (dragging) onseek(hover)
    }}
    onpointerup={() => (dragging = false)}
    onpointerleave={() => (hover = null)}
  ></canvas>
  <div class="legend">
    <span class="k"><i></i>Knee bend <b class="num">{knee === null ? 'n/a' : `${Math.round(knee)}°`}</b></span>
    <span class="h"><i></i>Hip height <b class="num">{hip === null ? 'n/a' : `${Math.round(hip * 100)} cm`}</b></span>
    {#each spans as s (s.id)}
      <span class="s"><i></i>{s.label}</span>
    {/each}
  </div>
</div>

<style>
  .tl {
    background: var(--stage);
    border-radius: 4px;
    padding: 0.5rem 0 0.6rem;
  }
  canvas {
    display: block;
    width: 100%;
    cursor: ew-resize;
    touch-action: none;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.25rem;
    padding: 0.4rem 0.75rem 0;
    font-size: var(--step--1);
    color: #a8a8a8;
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .legend b {
    color: #f2f2f2;
    font-weight: 650;
  }
  i {
    width: 0.9rem;
    height: 3px;
    border-radius: 2px;
    display: inline-block;
  }
  .k i {
    background: var(--signal);
  }
  .h i {
    background: #6b6b6b;
  }
  .s i {
    background: var(--nolift);
    height: 0.6rem;
    width: 0.6rem;
    border-radius: 2px;
  }
</style>
