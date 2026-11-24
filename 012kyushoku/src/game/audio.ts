import type { FoodKind } from './food';
import { loadMuted, saveMuted } from './storage';

// 短い合成音を組み合わせる。音声ファイルがなくても端末上で再生できる。
export class AudioManager {
  muted = loadMuted();
  private context?: AudioContext;

  unlock(): void {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume();
    } catch { /* Web Audio が使えない端末でもゲームを続ける */ }
  }
  toggle(): void { this.muted = !this.muted; saveMuted(this.muted); }

  private tone(frequency: number, duration: number, type: OscillatorType, delay = 0, end = frequency, volume = 0.035): void {
    if (this.muted || !this.context) return;
    const c = this.context;
    const start = c.currentTime + delay;
    const oscillator = c.createOscillator();
    const gain = c.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(c.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  pour(food: FoodKind): void {
    if (food === 'soup' || food === 'stew') this.tone(360, 0.16, 'sine', 0, 160, 0.025);
    else if (food === 'honey') this.tone(130, 0.32, 'sine', 0, 85, 0.03);
    else if (food === 'kakigori') { this.tone(1200, 0.07, 'triangle', 0, 700, 0.015); this.tone(900, 0.06, 'triangle', 0.05, 500, 0.012); }
    else { this.tone(330, 0.06, 'triangle', 0, 180); this.tone(260, 0.05, 'triangle', 0.07, 150); }
  }

  play(name: string): void {
    switch (name) {
      case 'serve': this.tone(400, 0.09, 'triangle', 0, 570); break;
      case 'perfect': [660, 880, 1320].forEach((f, i) => this.tone(f, 0.2, 'sine', i * 0.07)); break;
      case 'good': [550, 740].forEach((f, i) => this.tone(f, 0.15, 'sine', i * 0.09)); break;
      case 'ok': this.tone(440, 0.16, 'triangle', 0, 390); break;
      case 'bad': this.tone(290, 0.5, 'triangle', 0, 105); break;
      case 'low': [0, 0.1, 0.2].forEach(d => this.tone(180, 0.06, 'square', d, 110, 0.012)); break;
      case 'hungry': this.tone(100, 0.45, 'sine', 0, 65); break;
      case 'clear': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.24, 'triangle', i * 0.12)); break;
      case 'demo': this.tone(550, 0.18, 'sine', 0, 700); break;
    }
  }
}
