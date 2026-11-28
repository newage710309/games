// 告知動画の仕上げ：promo.html で書き出したコマ（v_0000.jpg …）と音のきっかけ（promo_sounds.json）から、
// ゲームと同じ効果音（src/game/audio.ts の TONES）を WAV に合成し、ffmpeg で MP4 にする。
// 使い方：npx esbuild tools/promo.ts --bundle --platform=node --outfile=dist-tools/promo.cjs && node dist-tools/promo.cjs <コマのフォルダ> <出力.mp4>
//
// インスタでそのまま使えるように、30fps 固定・H.264・AAC・faststart の、ふつうの（断片化していない）MP4 にする。

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TONES, type SoundName } from '../src/game/audio';

const dir = process.argv[2]!;
const out = process.argv[3]!;
const info = JSON.parse(readFileSync(join(dir, 'promo_sounds.json'), 'utf8')) as {
  fps: number;
  frames: number;
  sounds: { t: number; name: SoundName; pitch: number }[];
};

const RATE = 48000;
const total = info.frames / info.fps;
const N = Math.ceil(total * RATE);
const buf = new Float32Array(N);

const ATTACK = 0.006;
const SUSTAIN = 0.55;
const MASTER = 0.9;

/** 乱数（ノイズ用。毎回同じ音になるように種を決める）。 */
let seed = 12345;
const rnd = (): number => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

function env(t: number, dur: number, gain: number): number {
  const attack = Math.min(ATTACK, dur * 0.25);
  if (t < attack) return 0.0001 * Math.pow(gain / 0.0001, t / attack);
  if (t < dur * SUSTAIN) return gain;
  const k = (t - dur * SUSTAIN) / (dur * (1 - SUSTAIN));
  return gain * Math.pow(0.0001 / gain, Math.min(1, k));
}

function osc(type: string, phase: number): number {
  const p = phase - Math.floor(phase);
  if (type === 'sine') return Math.sin(p * Math.PI * 2);
  if (type === 'square') return p < 0.5 ? 1 : -1;
  if (type === 'triangle') return p < 0.5 ? p * 4 - 1 : 3 - p * 4;
  return p * 2 - 1; // sawtooth
}

function addSound(start: number, name: SoundName, pitch: number): void {
  let at = start;
  let prev = start;
  for (const tone of TONES[name]) {
    if (tone.with) at = prev;
    prev = at;
    const i0 = Math.floor(at * RATE);
    const n = Math.floor(tone.dur * RATE);
    if (tone.type === 'noise') {
      // バンドパス（RBJ の式、Q = 1.2）を通したホワイトノイズ
      const f0 = tone.freq * pitch;
      const w0 = (2 * Math.PI * f0) / RATE;
      const alpha = Math.sin(w0) / (2 * 1.2);
      const a0 = 1 + alpha;
      const b0 = alpha / a0;
      const b2 = -alpha / a0;
      const a1 = (-2 * Math.cos(w0)) / a0;
      const a2 = (1 - alpha) / a0;
      let x1 = 0;
      let x2 = 0;
      let y1 = 0;
      let y2 = 0;
      for (let k = 0; k < n && i0 + k < N; k++) {
        const x = rnd() * 2 - 1;
        const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1;
        x1 = x;
        y2 = y1;
        y1 = y;
        if (i0 + k >= 0) buf[i0 + k]! += y * env(k / RATE, tone.dur, tone.gain);
      }
    } else {
      let phase = 0;
      for (let k = 0; k < n && i0 + k < N; k++) {
        const u = k / n;
        const f = tone.sweepTo !== undefined ? tone.freq * Math.pow(tone.sweepTo / tone.freq, u) : tone.freq;
        phase += (f * pitch) / RATE;
        if (i0 + k >= 0) buf[i0 + k]! += osc(tone.type, phase) * env(k / RATE, tone.dur, tone.gain);
      }
    }
    at += tone.dur;
  }
}

for (const s of info.sounds) addSound(s.t, s.name, s.pitch);

// マスター音量と、やわらかいリミッター（重なっても割れないように）
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const v = Math.tanh(buf[i]! * MASTER * 1.4) * 0.9;
  const s = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  pcm.writeInt16LE(s, i * 4);
  pcm.writeInt16LE(s, i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);
const wav = join(dir, 'promo_audio.wav');
writeFileSync(wav, Buffer.concat([header, pcm]));

execFileSync(
  'ffmpeg',
  [
    '-v', 'error', '-y',
    '-framerate', String(info.fps),
    '-i', join(dir, 'v_%04d.jpg'),
    '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(info.fps),
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart',
    '-shortest',
    out
  ],
  { stdio: 'inherit' }
);
console.log(`${out}（${total.toFixed(2)} 秒、音 ${info.sounds.length} こ）`);
