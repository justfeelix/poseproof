<script lang="ts">
  import { onDestroy } from 'svelte'
  import CameraPose from './CameraPose.svelte'
  import CheckList from './CheckList.svelte'
  import ReportCard from './ReportCard.svelte'
  import { evaluateLive, evaluateTrial, type Verdict } from '../lib/checks'
  import type { FrameContext, PoseSample } from '../lib/pose/types'
  import { downloadTrial } from '../lib/trial/io'
  import { TrialRecorder } from '../lib/trial/recorder'
  import type { Frame, TestKind, Trial } from '../lib/trial/types'

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

  const busy = $derived(phase === 'countdown' || phase === 'recording')
  const liveReady = $derived(!!live && live.results.every((r) => r.status !== 'fail'))

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

<div class="head">
  <div>
    <h1>Squat test</h1>
    <p class="quiet">Stand still for two seconds, then do three slow squats.</p>
  </div>
  <div class="controls">
    <div class="seg" role="radiogroup" aria-label="Test">
      <button role="radio" aria-checked={test === 'squat_front'} disabled={busy} onclick={() => (test = 'squat_front')}>
        Facing the camera
      </button>
      <button role="radio" aria-checked={test === 'squat_side'} disabled={busy} onclick={() => (test = 'squat_side')}>
        Side-on
      </button>
    </div>
    <label>
      <span class="sr">Recording length</span>
      <select bind:value={durationS} disabled={busy}>
        <option value={10}>10 seconds</option>
        <option value={20}>20 seconds</option>
        <option value={30}>30 seconds</option>
      </select>
    </label>
    {#if phase === 'recording'}
      <button class="btn dark" onclick={finish}>Stop recording</button>
    {:else}
      <button class="btn go" onclick={startTest} disabled={!cameraOn || phase === 'countdown'}>
        {phase === 'done' ? 'Record again' : 'Start test'}
      </button>
    {/if}
  </div>
</div>

<div class="layout">
  <div>
    <CameraPose {onframe} {onrunning}>
      {#if phase === 'countdown'}
        <div class="count num" aria-live="assertive">{countdown}</div>
      {:else if phase === 'recording'}
        <div class="rec">
          <span class="dot" aria-hidden="true"></span>
          <span class="num">{elapsedS.toFixed(1)} of {durationS} s</span>
        </div>
      {/if}
    </CameraPose>
  </div>

  <aside>
    {#if phase === 'done' && trial && verdict}
      {#key trial.id}
        <ReportCard {verdict} />
      {/key}
      <button class="btn save" onclick={() => trial && downloadTrial(trial)}>Save trial as JSON</button>
      <p class="quiet small">
        {trial.frames.length} frames over {((trial.frames.at(-1)?.t ?? 0) / 1000).toFixed(1)} s, {trial.model} model.
        Only landmarks are saved, never images.
      </p>
    {:else if phase === 'recording' || phase === 'countdown'}
      <div class="panel dark">
        <h3>Recording</h3>
        <p>Two seconds still. Three slow squats. Then stand until the timer ends.</p>
      </div>
    {:else if cameraOn && live}
      <div class="panel dark">
        <h3>{liveReady ? 'Ready when you are' : 'Not ready yet'}</h3>
        <p>{liveReady ? 'The camera has a clear view. Press Start test.' : 'Fix the red point first.'}</p>
        <div class="live">
          <CheckList results={live.results} grouped={false} onDark />
        </div>
      </div>
    {:else}
      <ol class="steps">
        <li><p><strong>Start the camera</strong> and step back until head and feet are inside the corner marks.</p></li>
        <li><p><strong>Wait until no setup point is red.</strong> Each one says what to fix.</p></li>
        <li><p><strong>Start the test.</strong> Three judges decide whether it counts.</p></li>
      </ol>
    {/if}
  </aside>
</div>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem 2rem;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
  }
  h1 {
    font-size: var(--step-4);
  }
  .head p {
    margin-top: 0.35rem;
  }
  .controls {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .seg {
    display: inline-flex;
    padding: 3px;
    border-radius: 999px;
    background: var(--plate);
  }
  .seg button {
    border: 0;
    background: transparent;
    min-height: 2.4rem;
    padding: 0 1rem;
    border-radius: 999px;
    font-weight: 600;
    color: var(--steel);
    transition: background-color 160ms var(--ease), color 160ms var(--ease);
  }
  .seg button[aria-checked='true'] {
    background: var(--ink);
    color: var(--chalk);
  }
  .seg button:disabled {
    cursor: not-allowed;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
    gap: 1.25rem;
    align-items: start;
  }
  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
  .panel.dark {
    background: var(--ink);
    color: #f2f2f2;
    padding: 1.5rem;
    border-radius: 4px;
  }
  .panel h3 {
    font-size: var(--step-2);
    color: var(--lit);
  }
  .panel p {
    margin-top: 0.4rem;
    color: #c9c9c9;
  }
  .live {
    margin-top: 1rem;
  }
  .steps {
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: step;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .steps li {
    counter-increment: step;
    display: grid;
    grid-template-columns: 2.25rem 1fr;
    gap: 0.75rem;
  }
  .steps li::before {
    content: counter(step);
    font-size: var(--step-3);
    font-weight: 850;
    font-stretch: 75%;
    line-height: 1;
    color: var(--signal);
  }
  .save {
    margin-top: 1rem;
  }
  .small {
    margin-top: 0.5rem;
    font-size: var(--step--1);
  }
  .count {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: clamp(6rem, 22vw, 14rem);
    font-weight: 900;
    color: var(--lit);
    text-shadow: 0 4px 30px rgba(0, 0, 0, 0.6);
  }
  .rec {
    position: absolute;
    top: 1rem;
    left: 1rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.35rem 0.8rem;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.7);
    font-weight: 650;
  }
  .dot {
    width: 0.65rem;
    height: 0.65rem;
    border-radius: 50%;
    background: var(--nolift);
    animation: blink 1s steps(2, start) infinite;
  }
  @keyframes blink {
    to {
      visibility: hidden;
    }
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
