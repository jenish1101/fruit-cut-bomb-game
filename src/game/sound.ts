// Lightweight WebAudio synth for game feedback sounds — no external assets needed.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted = false;

  private getCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const bufferSize = ctx.sampleRate * 1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private tone(freq: number, duration: number, opts: Partial<{ type: OscillatorType; gain: number; freqEnd: number; delay: number }> = {}) {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const { type = "sine", gain = 0.2, freqEnd, delay = 0 } = opts;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + duration);
    }
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noise(duration: number, opts: Partial<{ gain: number; filterFreq: number; filterType: BiquadFilterType; delay: number }> = {}) {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const { gain = 0.3, filterFreq = 1000, filterType = "lowpass", delay = 0 } = opts;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  slice() {
    const pitch = 500 + Math.random() * 300;
    this.tone(pitch, 0.12, { type: "sine", gain: 0.12, freqEnd: pitch * 0.4 });
    this.noise(0.1, { gain: 0.08, filterFreq: 3000, filterType: "highpass" });
  }

  combo(n: number) {
    const base = 600 + n * 70;
    this.tone(base, 0.14, { type: "triangle", gain: 0.14, freqEnd: base * 1.6 });
  }

  golden() {
    [0, 0.06, 0.12].forEach((delay, i) => {
      this.tone(700 + i * 220, 0.18, { type: "triangle", gain: 0.16, freqEnd: 1400 + i * 220, delay });
    });
  }

  miss() {
    this.tone(220, 0.22, { type: "sawtooth", gain: 0.1, freqEnd: 90 });
  }

  explosion() {
    this.noise(0.6, { gain: 0.45, filterFreq: 800, filterType: "lowpass" });
    this.tone(90, 0.5, { type: "sawtooth", gain: 0.35, freqEnd: 30 });
  }

  gameOver() {
    [440, 349, 293, 220].forEach((f, i) => this.tone(f, 0.28, { type: "sine", gain: 0.16, delay: i * 0.14 }));
  }

  start() {
    [330, 440, 550, 660].forEach((f, i) => this.tone(f, 0.14, { type: "triangle", gain: 0.14, delay: i * 0.07 }));
  }

  click() {
    this.tone(500, 0.08, { type: "square", gain: 0.08, freqEnd: 700 });
  }

  toggleMute(forceState?: boolean) {
    this.muted = forceState ?? !this.muted;
    return this.muted;
  }
}

export const sound = new SoundEngine();
