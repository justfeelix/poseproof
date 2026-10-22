<script lang="ts">
  import { CHECK_BY_ID } from '../lib/checks'
  import { DEFAULT_CONFIG } from '../lib/checks/config'
  import { JUDGES } from '../lib/checks/judges'
  import { LIFTERS } from '../lib/lifting'

  const PIPELINE = [
    { name: 'Camera', note: 'Any webcam or phone, 30 fps' },
    { name: '2D keypoints', note: '33 landmarks per frame, MediaPipe Pose' },
    { name: '3D lift', note: 'Metric 3D joints from the 2D sequence' },
    { name: 'Checks', note: '9 measurements, each with a stated limit' },
    { name: 'Verdict', note: 'Three judges: good test or no test' },
  ]

  const LIMITS: Partial<Record<string, string>> = {
    framing: `${DEFAULT_CONFIG.framing.minFrameFraction * 100}% of frames fully in view`,
    one_person: `second person in under ${DEFAULT_CONFIG.onePerson.maxFrameFraction * 100}% of frames`,
    orientation: `within ${DEFAULT_CONFIG.orientation.frontMaxDeg}° of facing the camera`,
    visibility: `key joints hidden under ${DEFAULT_CONFIG.visibility.maxHiddenFraction * 100}% of frames`,
    stability: `bone length variation under ${DEFAULT_CONFIG.stability.maxBoneCv * 100}%`,
    calm_start: `hip moves under ${DEFAULT_CONFIG.calmStart.maxHipStdM * 100} cm in the first ${DEFAULT_CONFIG.calmStart.windowS} s`,
    depth: `knee bend of at least ${DEFAULT_CONFIG.depth.minKneeFlexionDeg}°`,
    heels: `heel rise under ${DEFAULT_CONFIG.heels.maxLiftM * 100} cm`,
    tempo: `at least ${DEFAULT_CONFIG.tempo.minDescentS} s on the way down`,
  }
</script>

<article>
  <h1>How a test is judged</h1>

  <ol class="pipe">
    {#each PIPELINE as step (step.name)}
      <li>
        <strong>{step.name}</strong>
        <span>{step.note}</span>
      </li>
    {/each}
  </ol>

  <section class="judges">
    {#each JUDGES as judge (judge.id)}
      <div class="judge">
        <h2>{judge.name}</h2>
        <ul>
          {#each judge.checks as id (id)}
            <li>
              <strong>{CHECK_BY_ID[id].label}</strong>
              <span class="num">{LIMITS[id]}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </section>

  <section class="lift">
    <h2>3D lifting</h2>
    <table>
      <thead><tr><th>Source</th><th>How</th><th>Status</th></tr></thead>
      <tbody>
        {#each LIFTERS as l (l.id)}
          <tr>
            <td>{l.name}</td>
            <td>{l.about}</td>
            <td><span class="st" class:on={l.available}>{l.available ? 'Live' : 'In progress'}</span></td>
          </tr>
        {/each}
        <tr>
          <td>Two-camera reference</td>
          <td>Two calibrated cameras, triangulated. Ground truth for comparing lifters.</td>
          <td><span class="st">Planned</span></td>
        </tr>
      </tbody>
    </table>
  </section>

  <p class="src">
    Limits are starting values and are tuned on labelled recordings.
    <a href="https://github.com/justfeelix/poseproof">Code, evaluation and limitations on GitHub</a>
  </p>
</article>

<style>
  article {
    max-width: 72rem;
  }
  h1 {
    font-size: clamp(var(--step-4), 5vw, var(--step-5));
    font-stretch: 120%;
    font-weight: 850;
    letter-spacing: -0.02em;
    margin-bottom: 1.75rem;
  }
  .pipe {
    list-style: none;
    margin: 0 0 2rem;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    counter-reset: s;
  }
  .pipe li {
    counter-increment: s;
    position: relative;
    padding: 0.9rem 1rem 0.9rem 0;
    border-top: 3px solid var(--ink);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .pipe li::before {
    content: counter(s);
    font-size: var(--step-3);
    font-weight: 850;
    font-stretch: 75%;
    color: var(--signal);
    line-height: 1;
    margin-bottom: 0.4rem;
  }
  .pipe span {
    font-size: var(--step--1);
    color: var(--steel);
  }
  @media (max-width: 820px) {
    .pipe {
      grid-template-columns: 1fr 1fr;
    }
  }
  .judges {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    background: var(--ink);
    color: #f2f2f2;
    border-radius: 4px;
  }
  @media (max-width: 860px) {
    .judges {
      grid-template-columns: 1fr;
    }
  }
  .judge {
    padding: 1.5rem;
  }
  .judge + .judge {
    border-left: 1px solid #2b2b2b;
  }
  .judge h2 {
    font-size: var(--step-2);
    color: var(--lit);
    margin-bottom: 0.75rem;
  }
  .judge ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .judge li {
    display: flex;
    flex-direction: column;
    padding: 0.55rem 0;
    border-top: 1px solid #2b2b2b;
  }
  .judge li span {
    font-size: var(--step--1);
    color: #a8a8a8;
  }
  .lift {
    margin-top: 2.25rem;
  }
  .lift h2 {
    font-size: var(--step-2);
    margin-bottom: 0.75rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    text-align: left;
    font-size: var(--step--1);
    color: var(--steel);
    font-weight: 700;
    padding: 0 1rem 0.4rem 0;
    border-bottom: 2px solid var(--ink);
  }
  td {
    padding: 0.65rem 1rem 0.65rem 0;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }
  td:first-child {
    font-weight: 700;
    white-space: nowrap;
  }
  .st {
    display: inline-block;
    padding: 0.1rem 0.6rem;
    border-radius: 999px;
    border: 2px solid var(--line);
    font-size: var(--step--1);
    font-weight: 700;
    color: var(--steel);
    white-space: nowrap;
  }
  .st.on {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--chalk);
  }
  .src {
    margin-top: 2rem;
    color: var(--steel);
  }
</style>
