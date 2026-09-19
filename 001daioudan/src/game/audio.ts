import { isTouchDevice } from './device';

export type SoundName = 'hop' | 'home' | 'death' | 'fly' | 'clear';

/**
 * 全体の音量（0 = 無音、1 = 最大）。うるさい／小さいときはここだけ触ればよい。
 *
 * スマホの内蔵スピーカーは非力なので強めに出す必要がある一方、
 * PC はスピーカーもヘッドホンも素直に鳴るので同じ値だと大きすぎる。
 * 端末ごとに分けている。
 */
const MASTER_GAIN_TOUCH = 0.8;
const MASTER_GAIN_DESKTOP = 0.3;

const masterGain = (): number => (isTouchDevice() ? MASTER_GAIN_TOUCH : MASTER_GAIN_DESKTOP);

/** 立ち上がりを一瞬だけ鈍らせて、ブツッというクリックノイズを防ぐ。 */
const ATTACK = 0.006;

/**
 * 音量を保つ区間の割合。立ち上がり直後から減衰を始めると、
 * 指数カーブがすぐ落ちきって実効音量（RMS）が一気に下がり、
 * ピーク値をいくら上げても「小さい音」に聞こえてしまう。
 */
const SUSTAIN = 0.55;

interface Tone {
  freq: number;
  dur: number;
  type: OscillatorType;
  gain: number;
  sweepTo?: number;
}

/**
 * スマホのスピーカーは 200Hz 以下がほとんど鳴らないため、
 * 低い音に落とすスイープでも 120Hz より下には行かせない。
 */
const TONES: Record<SoundName, Tone[]> = {
  hop: [{ freq: 520, dur: 0.08, type: 'square', gain: 0.34, sweepTo: 780 }],
  home: [
    { freq: 660, dur: 0.1, type: 'square', gain: 0.4 },
    { freq: 880, dur: 0.14, type: 'square', gain: 0.4 }
  ],
  death: [{ freq: 320, dur: 0.5, type: 'sawtooth', gain: 0.42, sweepTo: 120 }],
  fly: [{ freq: 1200, dur: 0.07, type: 'triangle', gain: 0.45, sweepTo: 1700 }],
  clear: [
    { freq: 523, dur: 0.11, type: 'square', gain: 0.4 },
    { freq: 659, dur: 0.11, type: 'square', gain: 0.4 },
    { freq: 784, dur: 0.11, type: 'square', gain: 0.4 },
    { freq: 1047, dur: 0.26, type: 'square', gain: 0.4 }
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
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

  /**
   * マスター音量 → リミッター → 出力。
   * コンプレッサーを挟むことで、音が重なってもクリップ（バリバリという歪み）
   * にならず、結果として平均音量を上げられる。
   */
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

  play(name: SoundName): void {
    const ctx = this.ctx;
    const bus = this.bus;
    if (this.muted || ctx === null || bus === null || ctx.state !== 'running') return;

    let at = ctx.currentTime;

    for (const tone of TONES[name]) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();

      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.freq, at);
      if (tone.sweepTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(tone.sweepTo, at + tone.dur);
      }

      // exponentialRampToValueAtTime は 0 を扱えないので微小値から始める。
      const attack = Math.min(ATTACK, tone.dur * 0.25);
      amp.gain.setValueAtTime(0.0001, at);
      amp.gain.exponentialRampToValueAtTime(tone.gain, at + attack);
      amp.gain.setValueAtTime(tone.gain, at + tone.dur * SUSTAIN); // ここまで音量を保つ
      amp.gain.exponentialRampToValueAtTime(0.0001, at + tone.dur);

      osc.connect(amp).connect(bus);
      osc.start(at);
      osc.stop(at + tone.dur);
      at += tone.dur;
    }
  }
}
