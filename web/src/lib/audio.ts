/**
 * Short beeps for recording without looking at the screen (Web Audio API, no files).
 *
 * Browsers only allow sound after a user gesture, so call unlockAudio() inside a click or
 * key handler (e.g. when Record is pressed); beep() is silent until then.
 */
let ctx: AudioContext | null = null

export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext()
    void ctx.resume()
  } catch {
    ctx = null
  }
}

/** One sine beep: frequency in Hz, length in ms, optional start offset in seconds. */
export function beep(freq = 880, ms = 150, at = 0): void {
  if (!ctx) return
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  // Ramp the volume up and down so the beep does not click.
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + ms / 1000 + 0.02)
}
