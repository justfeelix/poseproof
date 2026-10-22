<script lang="ts">
  import { onDestroy } from 'svelte'
  import Stage from './Stage.svelte'
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
  let empty = $state(false)
  let raf = 0
  let lastNow = 0

  const durationMs = $derived(trial.frames.at(-1)?.t ?? 0)
  const progress = $derived(durationMs ? (100 * tMs) / durationMs : 0)

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
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const frame = trial.frames[frameAt(tMs)]
    frame?.poses.forEach((p, k) => drawPose(ctx, p.image, canvas.width, canvas.height, { dim: k > 0 }))
    empty = !!frame && frame.poses.length === 0
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

<Stage mirrored={trial.mirrored} aspect={trial.image.width / trial.image.height}>
  {#snippet media()}
    <canvas bind:this={canvas}></canvas>
  {/snippet}
  {#if empty}<p class="empty">Nobody detected in this frame</p>{/if}
</Stage>

<div class="transport">
  <button class="play" onclick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
    {#if playing}
      <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4" width="3.5" height="12" /><rect x="11.5" y="4" width="3.5" height="12" /></svg>
    {:else}
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4l10 6-10 6z" /></svg>
    {/if}
  </button>
  <input
    type="range"
    min="0"
    max={durationMs}
    step="1"
    bind:value={tMs}
    oninput={render}
    style="--p: {progress}%"
    aria-label="Position in the trial"
  />
  <span class="time num">{(tMs / 1000).toFixed(1)} s</span>
  <label>
    <span class="sr">Playback speed</span>
    <select bind:value={speed}>
      <option value={0.25}>0.25×</option>
      <option value={0.5}>0.5×</option>
      <option value={1}>1×</option>
      <option value={2}>2×</option>
    </select>
  </label>
</div>

<style>
  .empty {
    position: absolute;
    left: 1rem;
    top: 1rem;
    color: #9a9a9a;
    font-weight: 600;
  }
  .transport {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    margin-top: 0.75rem;
  }
  .play {
    flex: 0 0 auto;
    width: 2.9rem;
    height: 2.9rem;
    border-radius: 50%;
    border: 0;
    background: var(--signal);
    display: grid;
    place-items: center;
    transition: transform 120ms var(--ease);
  }
  .play:active {
    transform: scale(0.94);
  }
  .play svg {
    width: 1.1rem;
    height: 1.1rem;
    fill: var(--ink);
  }
  input[type='range'] {
    flex: 1;
    appearance: none;
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right, var(--ink) var(--p), var(--plate) var(--p));
    cursor: pointer;
  }
  input[type='range']::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--chalk);
    border: 3px solid var(--ink);
  }
  input[type='range']::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--chalk);
    border: 3px solid var(--ink);
  }
  .time {
    min-width: 3.6rem;
    text-align: right;
    font-weight: 650;
    font-size: var(--step-1);
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
