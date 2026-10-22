<script lang="ts">
  import { onDestroy } from 'svelte'
  import { drawPose } from '../lib/pose/draw'
  import type { Trial } from '../lib/trial/types'

  interface Props {
    trial: Trial
  }
  let { trial }: Props = $props()

  let canvas: HTMLCanvasElement
  let playing = $state(false)
  let speed = $state(1)
  let tMs = $state(0)
  let raf = 0
  let lastNow = 0

  const durationMs = $derived(trial.frames.at(-1)?.t ?? 0)

  /** Index of the last frame with frame.t <= t (binary search). */
  function frameAt(t: number): number {
    const f = trial.frames
    let lo = 0
    let hi = f.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (f[mid].t <= t) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  function render() {
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const frame = trial.frames[frameAt(tMs)]
    frame?.poses.forEach((p, k) => drawPose(ctx, p.image, canvas.width, canvas.height, { dim: k > 0 }))
    if (frame && frame.poses.length === 0) {
      ctx.fillStyle = '#9ca3af'
      ctx.font = `${Math.round(canvas.width / 40)}px system-ui`
      ctx.fillText('no person detected', 20, 40)
    }
  }

  function tick(now: number) {
    if (!playing) return
    tMs += (now - lastNow) * speed
    lastNow = now
    if (tMs >= durationMs) {
      tMs = durationMs
      playing = false
    }
    render()
    if (playing) raf = requestAnimationFrame(tick)
  }

  function toggle() {
    if (playing) {
      playing = false
      cancelAnimationFrame(raf)
      return
    }
    if (tMs >= durationMs) tMs = 0
    playing = true
    lastNow = performance.now()
    raf = requestAnimationFrame(tick)
  }

  // New trial: reset, size the canvas like the original video, draw the first frame.
  $effect(() => {
    void trial
    playing = false
    cancelAnimationFrame(raf)
    tMs = 0
    if (canvas) {
      canvas.width = trial.image.width
      canvas.height = trial.image.height
      render()
    }
  })

  onDestroy(() => cancelAnimationFrame(raf))
</script>

<div class="player">
  <canvas bind:this={canvas} class:mirrored={trial.mirrored}></canvas>
  <div class="controls">
    <button class="primary" onclick={toggle}>{playing ? 'Pause' : 'Play'}</button>
    <input
      type="range"
      min="0"
      max={durationMs}
      step="1"
      bind:value={tMs}
      oninput={render}
      aria-label="Position in trial"
    />
    <span class="muted time">{(tMs / 1000).toFixed(1)} / {(durationMs / 1000).toFixed(1)} s</span>
    <select bind:value={speed} aria-label="Playback speed">
      <option value={0.25}>0.25×</option>
      <option value={0.5}>0.5×</option>
      <option value={1}>1×</option>
      <option value={2}>2×</option>
    </select>
  </div>
</div>

<style>
  canvas {
    width: 100%;
    display: block;
    border-radius: var(--radius);
    background: #111;
  }
  canvas.mirrored {
    transform: scaleX(-1);
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.5rem;
  }
  input[type='range'] {
    flex: 1;
  }
  .time {
    font-variant-numeric: tabular-nums;
    min-width: 7rem;
    text-align: right;
  }
</style>
