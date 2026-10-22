<script lang="ts">
  import type { Snippet } from 'svelte'
  import { DEFAULT_CONFIG } from '../lib/checks/config'

  interface Props {
    /** Mirror the media layer (front camera), never the overlays. */
    mirrored?: boolean
    /** Width / height of the media, e.g. 16 / 9. */
    aspect?: number
    /** The video and/or canvas. */
    media: Snippet
    /** Text and controls on top, not mirrored. */
    children?: Snippet
  }
  let { mirrored = false, aspect = 16 / 9, media, children }: Props = $props()

  // The corner marks show the safe area the framing check uses: whatever is outside them
  // counts as cut off.
  const inset = `${DEFAULT_CONFIG.framing.margin * 100}%`
</script>

<div class="stage" style="aspect-ratio: {aspect}; --inset: {inset}">
  <div class="media" class:mirrored>{@render media()}</div>
  <div class="safe" aria-hidden="true">
    <i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i>
  </div>
  <div class="ruler" aria-hidden="true"></div>
  {#if children}<div class="over">{@render children()}</div>{/if}
</div>

<style>
  .stage {
    position: relative;
    width: 100%;
    background: var(--stage);
    border-radius: 4px;
    overflow: hidden;
    color: #fff;
  }
  .media,
  .media :global(video),
  .media :global(canvas) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .media :global(video) {
    object-fit: cover;
  }
  .mirrored {
    transform: scaleX(-1);
  }
  .safe {
    position: absolute;
    inset: var(--inset);
    pointer-events: none;
  }
  .safe i {
    position: absolute;
    width: 1.4rem;
    height: 1.4rem;
    border: 0 solid rgba(255, 255, 255, 0.55);
  }
  .tl {
    top: 0;
    left: 0;
    border-top-width: 2px !important;
    border-left-width: 2px !important;
  }
  .tr {
    top: 0;
    right: 0;
    border-top-width: 2px !important;
    border-right-width: 2px !important;
  }
  .bl {
    bottom: 0;
    left: 0;
    border-bottom-width: 2px !important;
    border-left-width: 2px !important;
  }
  .br {
    bottom: 0;
    right: 0;
    border-bottom-width: 2px !important;
    border-right-width: 2px !important;
  }
  /* height ticks every 10% of the image, longer every 50% */
  .ruler {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 10px;
    background:
      repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.35) 0 1px, transparent 1px 10%) right / 6px 100% no-repeat,
      repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.6) 0 2px, transparent 2px 50%) right / 10px 100% no-repeat;
    pointer-events: none;
  }
  .over {
    position: absolute;
    inset: 0;
  }
</style>
