export class FlightAudio {
  enabled = true;
  private context?: AudioContext;

  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch { /* Sound is optional when a browser does not provide Web Audio. */ }
  }

  play(kind: 'start' | 'spark' | 'hit' | 'end' | 'milestone') {
    if (!this.enabled || !this.context) return;
    const ctx = this.context;
    const notes = kind === 'spark' ? [880, 1320] : kind === 'start' ? [440, 554, 659] : kind === 'milestone' ? [523, 659, 784, 1046] : kind === 'hit' ? [180, 120] : [330, 277, 220];
    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + index * 0.09;
      oscillator.type = kind === 'hit' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.075, start + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.32);
    });
  }
}
