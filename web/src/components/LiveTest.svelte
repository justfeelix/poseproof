<script lang="ts">
  import { onDestroy } from 'svelte'
  import CameraPose from './CameraPose.svelte'
  import CheckList from './CheckList.svelte'
  import ReportCard from './ReportCard.svelte'
  import { evaluateLive, evaluateTrial, type Verdict } from '../lib/checks'
  import type { FrameContext, PoseSample } from '../lib/pose/types'
  import { downloadTrial } from '../lib/trial/io'
  import { TrialRecorder } from '../lib/trial/recorder'
  import { TEST_LABELS, type Frame, type TestKind, type Trial } from '../lib/trial/types'

  type Phase = 'ready' | 'countdown' | 'recording' | 'done'

  const LIVE_WINDOW_MS = 1000 // live guidance looks at the last second
  const LIVE_EVERY_MS = 300

  let cameraOn = $state(false)
  let phase = $state<Phase>('ready')
  let test = $state<TestKind>('squat_front')
  let durationS = $state(20)
  let countdown = $state(0)
  let elapsedS = $state(0)
  let trial = $state<Trial | null>(null)
  let verdict = $state<Verdict | null>(null)
  let live = $state<Verdict | null>(null)

  const recorder = new TrialRecorder()
  let timer: ReturnType<typeof setInterval> | undefined
  let lastCtx: FrameContext | null = null
  let buffer: Frame[] = []
  let lastLive = 0

  function startTest() {
    trial = null
    verdict = null
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
    verdict = trial ? evaluateTrial(trial) : null
    phase = 'done'
  }

  function onframe(tMs: number, poses: PoseSample[], ctx: FrameContext) {
    lastCtx = ctx
    if (phase === 'recording') {
      recorder.push(tMs, poses)
      elapsedS = recorder.elapsed / 1000
      if (elapsedS >= durationS) finish()
      return
    }
    // Live guidance while setting up: rolling one-second window.
    buffer.push({ t: tMs, poses })
    while (buffer.length && tMs - buffer[0].t > LIVE_WINDOW_MS) buffer.shift()
    if (tMs - lastLive > LIVE_EVERY_MS) {
      lastLive = tMs
      live = evaluateLive(buffer, test)
    }
  }

  function onrunning(running: boolean) {
    cameraOn = running
    buffer = []
    live = null
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
    <button class="primary" onclick={startTest} disabled={!cameraOn || phase === 'countdown'}>
      {phase === 'done' ? 'Record again' : 'Start test'}
    </button>
  {/if}
  {#if !cameraOn}<span class="muted">Start the camera first.</span>{/if}
</div>

<div class="layout">
  <div class="camera">
    <CameraPose {onframe} {onrunning}>
      {#if phase === 'countdown'}
        <div class="banner big">{countdown}</div>
      {:else if phase === 'recording'}
        <div class="banner rec">● REC {elapsedS.toFixed(1)} / {durationS} s</div>
      {/if}
    </CameraPose>
  </div>

  <aside>
    {#if phase === 'done' && trial && verdict}
      <ReportCard {verdict} />
      <div class="actions">
        <button onclick={() => trial && downloadTrial(trial)}>Download trial (JSON)</button>
      </div>
      <p class="muted small">
        {trial.frames.length} frames · {((trial.frames.at(-1)?.t ?? 0) / 1000).toFixed(1)} s · {trial.model}
      </p>
    {:else if phase === 'recording'}
      <div class="panel">
        <strong>Recording</strong>
        <p class="muted">Stand still for two seconds, then do three slow squats.</p>
      </div>
    {:else if cameraOn && live}
      <div class="panel">
        <strong>Before you start</strong>
        <p class="muted small">Live check of the last second.</p>
        <CheckList results={live.results} />
      </div>
    {:else}
      <div class="panel muted">
        <p>1. Start the camera and step back until your whole body is visible.</p>
        <p>2. Wait until the setup checks are green.</p>
        <p>3. Press “Start test”, stand still, then do three slow squats.</p>
      </div>
    {/if}
  </aside>
</div>

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
  .layout {
    display: grid;
    grid-template-columns: 1fr minmax(260px, 320px);
    gap: 1rem;
    align-items: start;
  }
  @media (max-width: 860px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
  aside p {
    margin: 0.4rem 0;
  }
  .small {
    font-size: 0.85rem;
  }
  .actions {
    margin-top: 0.75rem;
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
</style>
