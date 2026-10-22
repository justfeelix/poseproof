<script lang="ts">
  import { CHECK_BY_ID } from '../lib/checks'
  import { JUDGES } from '../lib/checks/judges'
</script>

<article>
  <header>
    <h1>A squat test only counts if the camera saw it properly</h1>
    <p class="lede">
      Self-service fitness tests run without a trainer next to you. PoseProof watches the test through an
      ordinary camera and decides whether the result can be trusted, the way three judges decide on a lift:
      a white light for good, a red light for no.
    </p>
  </header>

  <section class="judges">
    {#each JUDGES as judge, i (judge.id)}
      <div class="judge">
        <span class="lamp" class:red={i === 1} aria-hidden="true"></span>
        <h2>{judge.name}</h2>
        <p class="q">{judge.question}</p>
        <ul>
          {#each judge.checks as id (id)}
            <li>
              <strong>{CHECK_BY_ID[id].label}</strong>
              <span>{CHECK_BY_ID[id].feedback}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </section>

  <section class="facts">
    <div>
      <h3>On your device</h3>
      <p>
        MediaPipe Pose runs in the browser. The video never leaves your device; a saved trial contains 33 body
        landmarks per frame and nothing else.
      </p>
    </div>
    <div>
      <h3>Measured, then judged</h3>
      <p>
        Each check reduces the trial to one number, such as the share of frames with the feet in view or the
        heel rise in centimetres, and compares it with a stated limit.
      </p>
    </div>
    <div>
      <h3>Checked against labels</h3>
      <p>
        The evaluation uses hand-labelled recordings, half done correctly and half with one deliberate error,
        and reports precision and recall per error type.
      </p>
    </div>
  </section>

  <p class="src">
    Source code, evaluation and limitations:
    <a href="https://github.com/justfeelix/poseproof">github.com/justfeelix/poseproof</a>
  </p>
</article>

<style>
  article {
    max-width: 72rem;
  }
  header {
    max-width: 52rem;
    margin-bottom: 2.5rem;
  }
  h1 {
    font-size: clamp(var(--step-4), 6vw, 4.25rem);
    font-stretch: 118%;
    font-weight: 850;
    line-height: 1.02;
    letter-spacing: -0.02em;
  }
  .lede {
    margin-top: 1.25rem;
    font-size: var(--step-1);
    max-width: 58ch;
    color: #333;
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
    padding: 1.75rem 1.5rem;
  }
  .judge + .judge {
    border-left: 1px solid #2b2b2b;
  }
  @media (max-width: 860px) {
    .judge + .judge {
      border-left: 0;
      border-top: 1px solid #2b2b2b;
    }
  }
  .lamp {
    display: block;
    width: 2.6rem;
    height: 2.6rem;
    border-radius: 50%;
    background: var(--lit);
    box-shadow: 0 0 24px 3px rgba(255, 255, 255, 0.4);
    margin-bottom: 1.25rem;
  }
  .lamp.red {
    background: var(--nolift);
    box-shadow: 0 0 24px 3px rgba(227, 38, 43, 0.5);
  }
  .judge h2 {
    font-size: var(--step-3);
    color: var(--lit);
  }
  .q {
    margin-top: 0.4rem;
    color: #c9c9c9;
  }
  .judge ul {
    list-style: none;
    padding: 0;
    margin: 1.25rem 0 0;
  }
  .judge li {
    display: flex;
    flex-direction: column;
    padding: 0.6rem 0;
    border-top: 1px solid #2b2b2b;
  }
  .judge li span {
    font-size: var(--step--1);
    color: #a8a8a8;
  }
  .facts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 2rem;
    margin-top: 2.5rem;
  }
  @media (max-width: 860px) {
    .facts {
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }
  }
  .facts h3 {
    font-size: var(--step-1);
    margin-bottom: 0.4rem;
  }
  .facts p {
    color: #333;
    max-width: 40ch;
  }
  .src {
    margin-top: 2.5rem;
    color: var(--steel);
  }
</style>
