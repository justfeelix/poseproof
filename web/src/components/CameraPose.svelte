<script lang="ts">
  import { onDestroy } from 'svelte'
  import type { PoseLandmarker } from '@mediapipe/tasks-vision'
  import { createDetector, type DetectorInfo, type ModelVariant } from '../lib/pose/detector'
  import { drawPose } from '../lib/pose/draw'
  import { posesFromResult, type PoseSample } from '../lib/pose/types'

  interface Props {
    /** Called for every processed video frame with a monotonic timestamp in ms. */
    onframe?: (tMs: number, poses: PoseSample[], size: { width: number; height: number }) => void
  }
  let { onframe }: Props = $props()

  let video: HTMLVideoElement
  let canvas: HTMLCanvasElement

  let status = $state<'idle' | 'loading' | 'running' | 'error'>('idle')
  let error = $state('')
  let fps = $state(0)
  let persons = $state(0)
  let facing = $state<'user' | 'environment'>('user')
  let variant = $state<ModelVariant>('full')
  let info = $state<DetectorInfo | null>(null)

  let landmarker: PoseLandmarker | null = null
  let stream: MediaStream | null = null
  let raf = 0
  let lastVideoTime = -1
  let fpsWindow: number[] = []

  async function start() {
    status = 'loading'
    error = ''
    try {
      if (!landmarker || info?.variant !== variant) {
        landmarker?.close()
        const created = await createDetector(variant)
        landmarker = created.landmarker
        info = created.info
      }
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      video.srcObject = stream
      await video.play()
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      status = 'running'
      lastVideoTime = -1
      raf = requestAnimationFrame(loop)
    } catch (err) {
      status = 'error'
      error = err instanceof Error ? err.message : String(err)
      stopStream()
    }
  }

  function loop() {
    if (!landmarker || status !== 'running') return
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime
      const now = performance.now()
      const poses = posesFromResult(landmarker.detectForVideo(video, now))
      persons = poses.length
      render(poses)
      onframe?.(now, poses, { width: canvas.width, height: canvas.height })
      fpsWindow.push(now)
      while (fpsWindow.length && now - fpsWindow[0] > 1000) fpsWindow.shift()
      fps = fpsWindow.length
    }
    raf = requestAnimationFrame(loop)
  }

  function render(poses: PoseSample[]) {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    poses.forEach((p, k) => drawPose(ctx, p.image, canvas.width, canvas.height, { dim: k > 0 }))
  }

  function stopStream() {
    cancelAnimationFrame(raf)
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
  }

  export function stop() {
    stopStream()
    if (status === 'running') status = 'idle'
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }

  onDestroy(() => {
    stopStream()
    landmarker?.close()
  })
</script>

<div class="controls">
  {#if status === 'running'}
    <button onclick={stop}>Stop camera</button>
  {:else}
    <button class="primary" onclick={start} disabled={status === 'loading'}>
      {status === 'loading' ? 'Loading model…' : 'Start camera'}
    </button>
    <label>
      Camera
      <select bind:value={facing}>
        <option value="user">front</option>
        <option value="environment">back</option>
      </select>
    </label>
    <label>
      Model
      <select bind:value={variant}>
        <option value="lite">lite (fast)</option>
        <option value="full">full</option>
        <option value="heavy">heavy (accurate)</option>
      </select>
    </label>
  {/if}
  {#if status === 'running'}
    <span class="muted">{fps} fps · {persons} {persons === 1 ? 'person' : 'persons'} · {info?.variant}/{info?.delegate}</span>
  {/if}
</div>

{#if status === 'error'}
  <p class="error">Could not start: {error}</p>
{/if}

<div class="stage" class:mirrored={facing === 'user'} class:hidden={status !== 'running'}>
  <video bind:this={video} playsinline muted></video>
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }
  label {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.9rem;
  }
  .stage {
    position: relative;
    width: 100%;
    background: #111;
    border-radius: var(--radius);
    overflow: hidden;
  }
  .stage.hidden {
    display: none;
  }
  .stage.mirrored {
    transform: scaleX(-1);
  }
  video,
  canvas {
    display: block;
    width: 100%;
  }
  canvas {
    position: absolute;
    inset: 0;
    height: 100%;
  }
  .error {
    color: var(--fail);
  }
</style>
