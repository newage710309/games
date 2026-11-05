import { isTouchDevice } from './device';

export type SoundName =
  | 'pettan'
  | 'hai'
  | 'tick'
  | 'don'
  | 'koto'
  | 'snicker'
  | 'throw'
  | 'notte'
  | 'pat'
  | 'perfect'
  | 'good'
  | 'miss'
  | 'gotsun'
  | 'gaman'
  | 'snowHit'
  | 'splat'
  | 'peel'
  | 'stageClear'
  | 'start'
  | 'select'
  | 'clear'
  | 'jingle'
  | 'sad';

/**
 * 全体の音量（0 = 無音、1 = 最大）。スマホの内蔵スピーカーは非力なので強め、
 * PC は同じ値だと大きすぎるので控えめにしている（ほかのゲームと同じ設定）。
 */
const MASTER_GAIN_TOUCH = 0.8;
const MASTER_GAIN_DESKTOP = 0.3;

const masterGain = (): number => (isTouchDevice() ? MASTER_GAIN_TOUCH : MASTER_GAIN_DESKTOP);

/** 立ち上がりを一瞬だけ鈍らせて、ブツッというクリックノイズを防ぐ。 */
const ATTACK = 0.006;
/** 音量を保つ区間の割合。すぐ減衰させると実効音量が下がって小さく聞こえる。 */
const SUSTAIN = 0.55;

interface Tone {
  /** 発振器の周波数。noise のときはフィルターの中心周波数。 */
  freq: number;
  dur: number;
  type: OscillatorType | 'noise';
  gain: number;
  sweepTo?: number;
  /** 前の音と同時に鳴らす。 */
  with?: boolean;
}

const TONES: Record<SoundName, Tone[]> = {
  // ぺったん（杵がおもちに当たる。低い音と、ぺちゃっという音）
  pettan: [
    { freq: 170, dur: 0.14, type: 'triangle', gain: 0.5, sweepTo: 70 },
    { freq: 900, dur: 0.07, type: 'noise', gain: 0.26, with: true }
  ],
  // はいっ（タップの合図。木を打つような高い音）
  hai: [
    { freq: 880, dur: 0.05, type: 'square', gain: 0.17, sweepTo: 1175 },
    { freq: 1760, dur: 0.03, type: 'triangle', gain: 0.14, with: true }
  ],
  tick: [{ freq: 1320, dur: 0.05, type: 'triangle', gain: 0.3 }],
  // はやしの太鼓
  don: [{ freq: 110, dur: 0.1, type: 'sine', gain: 0.24, sweepTo: 70 }],
  // はやしのふし（琴のような音。pitch で高さを変える）
  koto: [{ freq: 587, dur: 0.2, type: 'triangle', gain: 0.1 }],
  // ニヤッ
  snicker: [
    { freq: 360, dur: 0.1, type: 'sawtooth', gain: 0.13, sweepTo: 520 },
    { freq: 300, dur: 0.16, type: 'sawtooth', gain: 0.13, sweepTo: 620 }
  ],
  throw: [{ freq: 500, dur: 0.22, type: 'noise', gain: 0.12 }],
  notte: [
    { freq: 659, dur: 0.07, type: 'square', gain: 0.17 },
    { freq: 880, dur: 0.07, type: 'square', gain: 0.17 },
    { freq: 1175, dur: 0.12, type: 'square', gain: 0.17 }
  ],
  // タップしたときの、ぺち
  pat: [{ freq: 1500, dur: 0.03, type: 'noise', gain: 0.12 }],
  perfect: [
    { freq: 1319, dur: 0.05, type: 'triangle', gain: 0.24 },
    { freq: 1976, dur: 0.1, type: 'triangle', gain: 0.22 }
  ],
  good: [{ freq: 988, dur: 0.07, type: 'triangle', gain: 0.22 }],
  miss: [{ freq: 240, dur: 0.22, type: 'sawtooth', gain: 0.26, sweepTo: 110 }],
  gotsun: [
    { freq: 180, dur: 0.12, type: 'square', gain: 0.4, sweepTo: 60 },
    { freq: 1800, dur: 0.12, type: 'noise', gain: 0.26, with: true },
    { freq: 1400, dur: 0.07, type: 'triangle', gain: 0.14 },
    { freq: 1100, dur: 0.07, type: 'triangle', gain: 0.14 },
    { freq: 1400, dur: 0.07, type: 'triangle', gain: 0.14 }
  ],
  gaman: [
    { freq: 784, dur: 0.05, type: 'triangle', gain: 0.2 },
    { freq: 1047, dur: 0.07, type: 'triangle', gain: 0.2 }
  ],
  snowHit: [
    { freq: 1300, dur: 0.1, type: 'noise', gain: 0.3 },
    { freq: 1568, dur: 0.07, type: 'triangle', gain: 0.2, with: true }
  ],
  splat: [{ freq: 500, dur: 0.18, type: 'noise', gain: 0.34 }],
  peel: [
    { freq: 523, dur: 0.06, type: 'triangle', gain: 0.26, sweepTo: 880 },
    { freq: 1319, dur: 0.12, type: 'triangle', gain: 0.24 }
  ],
  stageClear: [
    { freq: 659, dur: 0.1, type: 'triangle', gain: 0.38 },
    { freq: 784, dur: 0.1, type: 'triangle', gain: 0.38 },
    { freq: 1047, dur: 0.1, type: 'triangle', gain: 0.38 },
    { freq: 1319, dur: 0.3, type: 'triangle', gain: 0.38 }
  ],
  start: [
    { freq: 523, dur: 0.08, type: 'square', gain: 0.3 },
    { freq: 784, dur: 0.14, type: 'square', gain: 0.3 }
  ],
  select: [{ freq: 988, dur: 0.05, type: 'triangle', gain: 0.35 }],
  clear: [
    { freq: 523, dur: 0.1, type: 'square', gain: 0.38 },
    { freq: 659, dur: 0.1, type: 'square', gain: 0.38 },
    { freq: 784, dur: 0.1, type: 'square', gain: 0.38 },
    { freq: 1047, dur: 0.3, type: 'square', gain: 0.38 }
  ],
  jingle: [
    { freq: 784, dur: 0.12, type: 'triangle', gain: 0.35 },
    { freq: 659, dur: 0.12, type: 'triangle', gain: 0.35 },
    { freq: 784, dur: 0.12, type: 'triangle', gain: 0.35 },
    { freq: 1047, dur: 0.28, type: 'triangle', gain: 0.35 }
  ],
  sad: [
    { freq: 392, dur: 0.2, type: 'triangle', gain: 0.35 },
    { freq: 349, dur: 0.2, type: 'triangle', gain: 0.35 },
    { freq: 294, dur: 0.45, type: 'triangle', gain: 0.35 }
  ]
};

/** 音声ファイルを持たず WebAudio の発振器（とノイズ）だけで効果音を鳴らす。拍の時計もここが持つ。 */
export class Audio {
  private ctx: AudioContext | null = null;
  /** 音はここに繋ぐ。destination には直接繋がない。 */
  private bus: AudioNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  /** ゲームの時計 = いま使っている時計 + base。 */
  private base = 0;
  private usingAudio = false;
  private lastNow = 0;

  /** ユーザー操作のタイミングで呼ぶ（自動再生ポリシー対策）。 */
  unlock(): void {
    if (this.ctx === null) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (typeof Ctor !== 'function') return;
      try {
        this.ctx = new Ctor();
        this.bus = this.buildBus(this.ctx);
        this.noise = this.buildNoise(this.ctx);
      } catch {
        this.ctx = null;
        this.bus = null;
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /**
   * 拍と判定の時計（秒）。音が使えるあいだは AudioContext.currentTime で進む。
   * 音がまだ使えない（解錠前・非対応）あいだだけ performance.now で進め、切りかわっても値は飛ばない。
   */
  now(): number {
    const ctx = this.ctx;
    const running = ctx !== null && ctx.state === 'running';
    const raw = running ? ctx.currentTime : performance.now() / 1000;
    if (running !== this.usingAudio) {
      this.usingAudio = running;
      this.base = this.lastNow - raw;
    }
    this.lastNow = raw + this.base;
    return this.lastNow;
  }

  /** マスター音量 → リミッター → 出力。音が重なってもクリップしない。 */
  private buildBus(ctx: AudioContext): AudioNode {
    const master = ctx.createGain();
    master.gain.value = masterGain();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    master.connect(limiter).connect(ctx.destination);
    return master;
  }

  /** ホワイトノイズ（0.5 秒ぶん）。フィルターを通して効果音に混ぜる。 */
  private buildNoise(ctx: AudioContext): AudioBuffer {
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  /** いますぐ鳴らす。 */
  play(name: SoundName, pitch = 1): void {
    if (this.ctx !== null) this.schedule(name, pitch, this.ctx.currentTime);
  }

  /** ゲームの時計で at の時刻に鳴らす（拍に合わせる音は、少し先まで予約する）。 */
  playAt(name: SoundName, at: number, pitch = 1): void {
    const ctx = this.ctx;
    if (ctx === null || !this.usingAudio) return;
    this.schedule(name, pitch, Math.max(ctx.currentTime, at - this.base));
  }

  private schedule(name: SoundName, pitch: number, start: number): void {
    const ctx = this.ctx;
    const bus = this.bus;
    if (this.muted || ctx === null || bus === null || ctx.state !== 'running') return;

    let at = start;
    let prev = start;
    for (const tone of TONES[name]) {
      if (tone.with) at = prev;
      prev = at;
      const amp = ctx.createGain();
      const attack = Math.min(ATTACK, tone.dur * 0.25);
      amp.gain.setValueAtTime(0.0001, at);
      amp.gain.exponentialRampToValueAtTime(tone.gain, at + attack);
      amp.gain.setValueAtTime(tone.gain, at + tone.dur * SUSTAIN);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + tone.dur);
      amp.connect(bus);

      if (tone.type === 'noise') {
        if (this.noise === null) continue;
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = tone.freq * pitch;
        filter.Q.value = 1.2;
        src.connect(filter).connect(amp);
        src.start(at, Math.random() * 0.3);
        src.stop(at + tone.dur);
      } else {
        const osc = ctx.createOscillator();
        osc.type = tone.type;
        osc.frequency.setValueAtTime(tone.freq * pitch, at);
        if (tone.sweepTo !== undefined) {
          osc.frequency.exponentialRampToValueAtTime(tone.sweepTo * pitch, at + tone.dur);
        }
        osc.connect(amp);
        osc.start(at);
        osc.stop(at + tone.dur);
      }
      at += tone.dur;
    }
  }
}
