<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import type { Joint3 } from '../lib/lifting'
  import type { SkeletonScene, ViewPreset } from '../lib/viz/scene3d'

  interface Props {
    pose: Joint3[] | null
    ghost?: Joint3[] | null
    trail?: [number, number, number][] | null
    view?: ViewPreset
    /** Fires when the user drags the view (the parent switches the preset to 'free'). */
    onorbit?: () => void
  }
  let { pose, ghost = null, trail = null, view = 'front', onorbit }: Props = $props()

  let host: HTMLDivElement
  let scene = $state<SkeletonScene | null>(null)
  let failed = $state('')

  onMount(async () => {
    try {
      const mod = await import('../lib/viz/scene3d')
      scene = new mod.SkeletonScene(host)
      scene.onUserOrbit = () => onorbit?.()
    } catch (err) {
      failed = err instanceof Error ? err.message : String(err)
    }
  })
  onDestroy(() => scene?.dispose())

  $effect(() => {
    scene?.setPose(pose, ghost)
  })
  $effect(() => {
    scene?.setTrail(trail)
  })
  $effect(() => {
    scene?.view(view)
  })
</script>

<div class="host" bind:this={host}>
  {#if !scene && !failed}<span class="msg">Loading 3D</span>{/if}
  {#if failed}<span class="msg">3D view unavailable: {failed}</span>{/if}
</div>

<style>
  .host {
    position: absolute;
    inset: 0;
    cursor: grab;
    touch-action: none;
  }
  .host:active {
    cursor: grabbing;
  }
  .host :global(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
  .msg {
    position: absolute;
    left: 1rem;
    top: 1rem;
    color: #8c8c8c;
    font-weight: 600;
  }
</style>
