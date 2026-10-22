/** Shared clock for the review workspace: the 2D view, the 3D view and the timeline follow it. */
export class Playback {
  t = $state(0) // ms
  playing = $state(false)
  speed = $state(1)
  duration = $state(0)
  private raf = 0
  private last = 0

  load(durationMs: number) {
    this.pause()
    this.duration = durationMs
    this.t = 0
  }

  play() {
    if (this.t >= this.duration) this.t = 0
    this.playing = true
    this.last = performance.now()
    const tick = (now: number) => {
      if (!this.playing) return
      this.t = Math.min(this.duration, this.t + (now - this.last) * this.speed)
      this.last = now
      if (this.t >= this.duration) this.playing = false
      else this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  pause() {
    this.playing = false
    cancelAnimationFrame(this.raf)
  }

  toggle() {
    if (this.playing) this.pause()
    else this.play()
  }

  seek(ms: number) {
    this.t = Math.max(0, Math.min(this.duration, ms))
  }
}
