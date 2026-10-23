<script lang="ts">
  import { onDestroy, type Snippet } from 'svelte'
  import type { PoseLandmarker } from '@mediapipe/tasks-vision'
  import Stage from './Stage.svelte'
  import { createDetector, type DetectorInfo, type ModelVariant } from '../lib/pose/detector'
  import { drawPose } from '../lib/pose/draw'
  import { posesFromResult, type FrameContext, type PoseSample } from '../lib/pose/types'

  interface Props {
    /** Called for every processed video frame with a monotonic timestamp in ms. */
    onframe?: (tMs: number, poses: PoseSample[], ctx: FrameContext) => void
    /** Called when the camera starts or stops. */
    onrunning?: (running: boolean) => void
    /** Content on top of the running video (not mirrored), e.g. a countdown. */
    children?: Snippet
  }
  let { onframe, onrunning, children }: Props = $props()

  let video: HTMLVideoElement
  let canvas: HTMLCanvasElement

  let status = $state<'idle' | 'loading' | 'running' | 'error'>('idle')
  let error = $state('')
  let fps = $state(0)
  let persons = $state(0)
  let facing = $state<'user' | 'environment'>('user')
  let variant = $state<ModelVariant>('full')
  let info = $state<DetectorInfo | null>(null)
  let aspect = $state(16 / 9)

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
      aspect = video.videoWidth / video.videoHeight
      status = 'running'
      onrunning?.(true)
      lastVideoTime = -1
      raf = requestAnimationFrame(loop)
    } catch (err) {
      status = 'error'
      const msg = err instanceof Error ? err.message : String(err)
      error = /denied|NotAllowed/i.test(msg)
        ? 'Camera access was blocked. Allow the camera for this site in your browser settings, then try again.'
        : `The camera or the pose model could not start: ${msg}`
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
      onframe?.(now, poses, {
        width: canvas.width,
        height: canvas.height,
        mirrored: facing === 'user',
        model: info ? `${info.variant}/${info.delegate}` : 'unknown',
      })
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
    if (status === 'running') {
      status = 'idle'
      onrunning?.(false)
    }
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }

  onDestroy(() => {
    stopStream()
    landmarker?.close()
  })
</script>

<Stage mirrored={facing === 'user'} {aspect}>
  {#snippet media()}
    <video bind:this={video} playsinline muted class:hidden={status !== 'running'}></video>
    <canvas bind:this={canvas}></canvas>
  {/snippet}

  {#if status === 'running'}
    {@render children?.()}
  {:else}
    <div class="intro">
      <h2>Step into the frame</h2>
      <p>Pose tracking runs on this device. No video is uploaded.</p>
      <div class="row">
        <button class="btn go" onclick={start} disabled={status === 'loading'}>
          {status === 'loading' ? 'Loading model' : 'Start camera'}
        </button>
        <label>
          <span class="sr">Camera</span>
          <select bind:value={facing}>
            <option value="user">Front cam</option>
            <option value="environment">Back cam</option>
          </select>
        </label>
        <label>
          <span class="sr">Pose model</span>
          <select bind:value={variant}>
            <option value="lite">Lite model</option>
            <option value="full">Full model</option>
            <option value="heavy">Heavy model</option>
          </select>
        </label>
      </div>
      {#if status === 'error'}<p class="error" role="alert">{error}</p>{/if}
    </div>
  {/if}
</Stage>

{#if status === 'running'}
  <div class="bar">
    <button class="btn" onclick={stop}>Stop camera</button>
    <dl>
      <div><dt>Speed</dt><dd class="num">{fps} fps</dd></div>
      <div><dt>People</dt><dd class="num">{persons}</dd></div>
      <div><dt>Model</dt><dd>{info?.variant} on {info?.delegate}</dd></div>
    </dl>
  </div>
{/if}

<style>
  .hidden {
    visibility: hidden;
  }
  /* Sized by the stage's own width (cqi), not the window's: with the 3D view on, the stage is
     only a third of the window and the text used to overflow and get cut off at the top. */
  .intro {
    position: absolute;
    inset: 0;
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    justify-content: safe flex-end;
    gap: clamp(0.5rem, 2.5cqi, 0.9rem);
    padding: clamp(1rem, 5cqi, 2.5rem);
    overflow-y: auto;
    background: var(--stage);
  }
  .intro h2 {
    font-size: clamp(1.4rem, 8.5cqi, var(--step-5));
    font-stretch: 125%;
    font-weight: 850;
    color: var(--lit);
  }
  .intro p {
    font-size: clamp(0.85rem, 3.2cqi, 1rem);
    color: #c9c9c9;
    max-width: 46ch;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
  }
  .row select {
    background-color: transparent;
    color: #f2f2f2;
    border-color: #3a3a3a;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23f2f2f2' stroke-width='1.6' fill='none'/%3E%3C/svg%3E");
  }
  .row option {
    color: var(--ink);
  }
  .error {
    color: #ff8a8d !important;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
    margin-top: 0.75rem;
  }
  dl {
    display: flex;
    gap: 1.5rem;
    margin: 0;
  }
  dt {
    font-size: var(--step--1);
    color: var(--steel);
  }
  dd {
    margin: 0;
    font-weight: 650;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
