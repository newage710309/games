import { isTouchDevice } from './device';

export type SoundName =
  | 'cursor'
  | 'perch'
  | 'undo'
  | 'creak'
  | 'flap'
  | 'throw'
  | 'snowLand'
  | 'jump'
  | 'squeeze'
  | 'star'
  | 'nope'
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
  // 場所をえらぶ（カーソル）
  cursor: [{ freq: 1175, dur: 0.035, type: 'triangle', gain: 0.18 }],
  // 鳥が枝にとまる（ちょん、と小さく 2 つ）。重い鳥ほど pitch を下げて鳴らす
  perch: [
    { freq: 1568, dur: 0.05, type: 'triangle', gain: 0.26 },
    { freq: 2093, dur: 0.07, type: 'triangle', gain: 0.22 },
    { freq: 900, dur: 0.04, type: 'noise', gain: 0.08, with: true }
  ],
  undo: [{ freq: 880, dur: 0.12, type: 'triangle', gain: 0.24, sweepTo: 523 }],
  // 枝がきしむ（かたむきが赤に近いとき）
  creak: [{ freq: 140, dur: 0.22, type: 'sawtooth', gain: 0.1, sweepTo: 110 }],
  // ばさばさっ（飛び立つ）
  flap: [
    { freq: 700, dur: 0.07, type: 'noise', gain: 0.32 },
    { freq: 900, dur: 0.07, type: 'noise', gain: 0.28 },
    { freq: 650, dur: 0.07, type: 'noise', gain: 0.28 },
    { freq: 850, dur: 0.1, type: 'noise', gain: 0.24 }
  ],
  throw: [{ freq: 500, dur: 0.22, type: 'noise', gain: 0.14 }],
  snowLand: [
    { freq: 400, dur: 0.14, type: 'noise', gain: 0.32 },
    { freq: 220, dur: 0.1, type: 'triangle', gain: 0.18, with: true }
  ],
  // さくらちゃんが飛びこむ
  jump: [{ freq: 523, dur: 0.24, type: 'triangle', gain: 0.24, sweepTo: 1319 }],
  // だんごでぎゅっ
  squeeze: [
    { freq: 784, dur: 0.06, type: 'square', gain: 0.12 },
    { freq: 988, dur: 0.06, type: 'square', gain: 0.12 },
    { freq: 1319, dur: 0.12, type: 'square', gain: 0.12 }
  ],
  star: [{ freq: 1568, dur: 0.12, type: 'triangle', gain: 0.26 }],
  // とまれない場所・つり合っていない
  nope: [{ freq: 220, dur: 0.12, type: 'square', gain: 0.12 }],
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
    { freq: 523, dur: 0.1, type: 'square', gain: 0.32 },
    { freq: 659, dur: 0.1, type: 'square', gain: 0.32 },
    { freq: 784, dur: 0.1, type: 'square', gain: 0.32 },
    { freq: 1047, dur: 0.3, type: 'square', gain: 0.32 }
  ],
  jingle: [
    { freq: 784, dur: 0.12, type: 'triangle', gain: 0.35 },
    { freq: 659, dur: 0.12, type: 'triangle', gain: 0.35 },
    { freq: 784, dur: 0.12, type: 'triangle', gain: 0.35 },
    { freq: 1047, dur: 0.28, type: 'triangle', gain: 0.35 }
  ],
  sad: [
    { freq: 392, dur: 0.2, type: 'triangle', gain: 0.3 },
    { freq: 349, dur: 0.2, type: 'triangle', gain: 0.3 },
    { freq: 294, dur: 0.4, type: 'triangle', gain: 0.3 }
  ]
};

/** 音声ファイルを持たず WebAudio の発振器（とノイズ）だけで効果音を鳴らす。 */
export class Audio {
  private ctx: AudioContext | null = null;
  /** 音はここに繋ぐ。destination には直接繋がない。 */
  private bus: AudioNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

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
