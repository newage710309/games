import { isTouchDevice } from './device';

export type SoundName =
  | 'push'
  | 'stop'
  | 'break'
  | 'crush'
  | 'egg'
  | 'wall'
  | 'kick'
  | 'hatch'
  | 'lose'
  | 'start'
  | 'clear'
  | 'select'
  | 'jingle';

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
  freq: number;
  dur: number;
  type: OscillatorType;
  gain: number;
  sweepTo?: number;
}

const TONES: Record<SoundName, Tone[]> = {
  push: [{ freq: 260, dur: 0.09, type: 'triangle', gain: 0.4, sweepTo: 520 }],
  stop: [{ freq: 180, dur: 0.06, type: 'square', gain: 0.25, sweepTo: 120 }],
  break: [
    { freq: 1400, dur: 0.03, type: 'square', gain: 0.22, sweepTo: 700 },
    { freq: 900, dur: 0.06, type: 'triangle', gain: 0.3, sweepTo: 300 }
  ],
  crush: [
    { freq: 660, dur: 0.07, type: 'square', gain: 0.35 },
    { freq: 990, dur: 0.12, type: 'square', gain: 0.35, sweepTo: 1320 }
  ],
  egg: [
    { freq: 784, dur: 0.06, type: 'triangle', gain: 0.4 },
    { freq: 1175, dur: 0.1, type: 'triangle', gain: 0.4 }
  ],
  wall: [{ freq: 110, dur: 0.18, type: 'sawtooth', gain: 0.3, sweepTo: 70 }],
  kick: [{ freq: 520, dur: 0.12, type: 'square', gain: 0.32, sweepTo: 1040 }],
  hatch: [{ freq: 330, dur: 0.16, type: 'triangle', gain: 0.3, sweepTo: 660 }],
  lose: [{ freq: 440, dur: 0.7, type: 'sawtooth', gain: 0.38, sweepTo: 110 }],
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
  ]
};

/** 音声ファイルを持たず WebAudio の発振器だけで効果音を鳴らす。 */
export class Audio {
  private ctx: AudioContext | null = null;
  /** 発振器はここに繋ぐ。destination には直接繋がない。 */
  private bus: AudioNode | null = null;
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

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  /** pitch を掛けると音の高さを変えられる（まとめてつぶした数で音程を上げる用）。 */
  play(name: SoundName, pitch = 1): void {
    const ctx = this.ctx;
    const bus = this.bus;
    if (this.muted || ctx === null || bus === null || ctx.state !== 'running') return;

    let at = ctx.currentTime;
    for (const tone of TONES[name]) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.freq * pitch, at);
      if (tone.sweepTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(tone.sweepTo * pitch, at + tone.dur);
      }
      const attack = Math.min(ATTACK, tone.dur * 0.25);
      amp.gain.setValueAtTime(0.0001, at);
      amp.gain.exponentialRampToValueAtTime(tone.gain, at + attack);
      amp.gain.setValueAtTime(tone.gain, at + tone.dur * SUSTAIN);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + tone.dur);
      osc.connect(amp).connect(bus);
      osc.start(at);
      osc.stop(at + tone.dur);
      at += tone.dur;
    }
  }
}
