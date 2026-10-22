<script lang="ts">
  import Stage from './Stage.svelte'
  import { drawPose } from '../lib/pose/draw'
  import type { Trial } from '../lib/trial/types'

  interface Props {
    trial: Trial
    tMs: number
  }
  let { trial, tMs }: Props = $props()

  let canvas: HTMLCanvasElement
  let empty = $state(false)

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

  $effect(() => {
    if (!canvas) return
    if (canvas.width !== trial.image.width) canvas.width = trial.image.width
    if (canvas.height !== trial.image.height) canvas.height = trial.image.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const frame = trial.frames[frameAt(tMs)]
    frame?.poses.forEach((p, k) => drawPose(ctx, p.image, canvas.width, canvas.height, { dim: k > 0 }))
    empty = !!frame && frame.poses.length === 0
  })
</script>

<Stage mirrored={trial.mirrored} aspect={trial.image.width / trial.image.height}>
  {#snippet media()}
    <canvas bind:this={canvas}></canvas>
  {/snippet}
  {#if empty}<p class="empty">No person in this frame</p>{/if}
</Stage>

<style>
  .empty {
    position: absolute;
    left: 1rem;
    top: 1rem;
    margin: 0;
    color: #9a9a9a;
    font-weight: 600;
  }
</style>
