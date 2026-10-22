<script lang="ts">
  import { onDestroy } from 'svelte'
  import CameraPose from './CameraPose.svelte'
  import type { FrameContext, PoseSample } from '../lib/pose/types'
  import { downloadTrial } from '../lib/trial/io'
  import { TrialRecorder } from '../lib/trial/recorder'
  import { TEST_LABELS, type TestKind, type Trial } from '../lib/trial/types'

  type Phase = 'ready' | 'countdown' | 'recording' | 'done'

  let cameraOn = $state(false)
  let phase = $state<Phase>('ready')
  let test = $state<TestKind>('squat_front')
  let durationS = $state(20)
  let countdown = $state(0)
  let elapsedS = $state(0)
  let trial = $state<Trial | null>(null)

  const recorder = new TrialRecorder()
  let timer: ReturnType<typeof setInterval> | undefined
  let lastCtx: FrameContext | null = null

  function startTest() {
    trial = null
    phase = 'countdown'
    countdown = 3
    timer = setInterval(() => {
      countdown -= 1
      if (countdown <= 0) {
        clearInterval(timer)
        beginRecording()
      }
    }, 1000)
  }

  function beginRecording() {
    if (!lastCtx) {
      phase = 'ready'
      return
    }
    recorder.start({
      test,
      model: lastCtx.model,
      image: { width: lastCtx.width, height: lastCtx.height },
      mirrored: lastCtx.mirrored,
    })
    elapsedS = 0
    phase = 'recording'
  }

  function finish() {
    trial = recorder.stop()
    phase = 'done'
  }

  function onframe(tMs: number, poses: PoseSample[], ctx: FrameContext) {
    lastCtx = ctx
    if (phase !== 'recording') return
    recorder.push(tMs, poses)
    elapsedS = recorder.elapsed / 1000
    if (elapsedS >= durationS) finish()
  }

  function onrunning(running: boolean) {
    cameraOn = running
    if (!running && phase !== 'done') {
      clearInterval(timer)
      recorder.stop()
      phase = 'ready'
    }
  }

  onDestroy(() => clearInterval(timer))
</script>

<div class="setup">
  <label>
    Test
    <select bind:value={test} disabled={phase === 'countdown' || phase === 'recording'}>
      {#each Object.entries(TEST_LABELS) as [id, label] (id)}
        <option value={id}>{label}</option>
      {/each}
    </select>
  </label>
  <label>
    Duration
    <select bind:value={durationS} disabled={phase === 'countdown' || phase === 'recording'}>
      <option value={10}>10 s</option>
      <option value={20}>20 s</option>
      <option value={30}>30 s</option>
    </select>
  </label>
  {#if phase === 'recording'}
    <button onclick={finish}>Stop early</button>
  {:else}
    <button class="primary" onclick={startTest} disabled={!cameraOn || phase === 'countdown'}>Start test</button>
  {/if}
  {#if !cameraOn}<span class="muted">Start the camera first.</span>{/if}
</div>

<CameraPose {onframe} {onrunning}>
  {#if phase === 'countdown'}
    <div class="banner big">{countdown}</div>
  {:else if phase === 'recording'}
    <div class="banner rec">● REC {elapsedS.toFixed(1)} / {durationS} s</div>
  {/if}
</CameraPose>

{#if phase === 'done' && trial}
  <div class="result panel">
    <div>
      <strong>Trial recorded</strong>
      <span class="muted">
        {trial.frames.length} frames · {((trial.frames.at(-1)?.t ?? 0) / 1000).toFixed(1)} s · {trial.model}
      </span>
    </div>
    <div class="actions">
      <button onclick={() => trial && downloadTrial(trial)}>Download trial (JSON)</button>
      <button onclick={startTest} disabled={!cameraOn}>Record again</button>
    </div>
  </div>
{/if}

<style>
  .setup {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }
  label {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.9rem;
  }
  .banner {
    position: absolute;
    top: 0.75rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    border-radius: 999px;
    padding: 0.3rem 0.9rem;
    font-weight: 600;
  }
  .banner.big {
    top: 40%;
    font-size: 4rem;
    padding: 0.5rem 1.6rem;
  }
  .banner.rec {
    color: #fecaca;
  }
  .result {
    margin-top: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .result div:first-child {
    display: flex;
    flex-direction: column;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
