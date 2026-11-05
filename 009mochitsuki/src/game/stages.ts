// 面のデータと、調整しやすい数値をまとめたところ。時間の単位はすべて秒。

/** 判定の幅（±）。 */
export const JUDGE = {
  perfect: 0.05,
  good: 0.135,
  /** スマホでは音も指も遅れがちなので、「遅い」側だけ広げる。 */
  touchLateSlack: 0.03,
  /** 早すぎるタップをミスとして受けとる幅（これより早いタップは空振りで、何も起きない）。 */
  earlyMiss: 0.22,
  /** 杵が落ちてくる（ごつんになる）長さの上限。 */
  danger: 0.14,
  /** つかれた直後も、まだ杵が乗っている長さ。 */
  dangerAfter: 0.03
} as const;

export const SCORE = {
  perfect: 100,
  good: 50,
  feint: 50,
  snow: 100,
  /** れんぞくボーナス：comboEvery 回ごとに。 */
  comboEvery: 10,
  combo: 100,
  stage: 500,
  noMiss: 1000
} as const;

/** 何回ミスで埋まるか。 */
export const MAX_STUCK = 3;
/** ぴったりが何回続くと、おもちが 1 つはがれるか。 */
export const PEEL_CHAIN = 8;
/** よーいの長さ（このあと、2 拍の前奏が入る）。 */
export const READY_TIME = 2.2;
/** ポーズから戻るとき、これだけ巻きもどして、構えなおす時間を作る。 */
export const RESUME_REWIND = 1.2;
/** 雪玉が飛んでいる長さと、輪が出ている長さ。 */
export const SNOW_FLIGHT = 1.15;
export const SNOW_LEAD = 0.75;
/** はじめて見せるときの、ゆっくりした速さ（BPM）。 */
export const LESSON_BPM = 66;

export type Trick = 'feint' | 'fast' | 'away' | 'snow';

export interface Section {
  /** 速さ（BPM）。前の区切りより速いと「のってきた！」。 */
  bpm: number;
  /** この区切りでつく回数（はやつきは 2 回ぶん。フェイントはつかないので数えない）。 */
  strikes: number;
  tricks?: Partial<Record<Trick, number>>;
  /** この区切りの前に、ゆっくり見せるいたずら。 */
  lesson?: Trick;
}

export interface Stage {
  name: string;
  sections: Section[];
  /** ★★ と ★★★ に必要なぴったりの割合。 */
  stars: [number, number];
  /** 曲の高さ（半音）。 */
  key: number;
}

export const STAGES: Stage[] = [
  {
    name: '昼の森の広場',
    key: 0,
    stars: [0.5, 0.8],
    sections: [
      { bpm: 90, strikes: 12 },
      { bpm: 95, strikes: 8 },
      { bpm: 100, strikes: 10, lesson: 'feint', tricks: { feint: 2 } }
    ]
  },
  {
    name: '夕方の見物',
    key: 2,
    stars: [0.5, 0.8],
    sections: [
      { bpm: 105, strikes: 7, tricks: { feint: 1 } },
      { bpm: 105, strikes: 7, lesson: 'fast', tricks: { feint: 1, fast: 2 } },
      { bpm: 112, strikes: 11, tricks: { feint: 1, fast: 2 } },
      { bpm: 120, strikes: 15, lesson: 'away', tricks: { feint: 1, fast: 2, away: 3 } }
    ]
  },
  {
    name: '大みそかの夜',
    key: 5,
    stars: [0.5, 0.9],
    sections: [
      { bpm: 125, strikes: 8, tricks: { feint: 1, away: 1 } },
      { bpm: 125, strikes: 8, lesson: 'snow', tricks: { feint: 1, fast: 1, snow: 2 } },
      { bpm: 135, strikes: 17, tricks: { feint: 2, fast: 2, away: 2, snow: 3 } },
      { bpm: 145, strikes: 17, tricks: { feint: 2, fast: 2, away: 3, snow: 4 } }
    ]
  }
];

/** ぴったりの割合から星の数を出す（クリアすれば ★ は必ずつく）。 */
export function starsOf(stage: Stage, ratio: number): number {
  return ratio >= stage.stars[1] ? 3 : ratio >= stage.stars[0] ? 2 : 1;
}

export type NoteKind = 'hit' | 'fast' | 'away' | 'feint' | 'snow';

/** タップする（フェイントはしない）瞬間。 */
export interface Note {
  t: number;
  kind: NoteKind;
  /** 輪が出はじめてから t までの長さ。 */
  lead: number;
  /** 早すぎをミスにする幅。 */
  early: number;
  lesson: boolean;
  done: boolean;
  /** 雪玉：どの雪だるまが投げるか。 */
  from: number;
}

/** 杵がおもちに当たる瞬間。 */
export interface Strike {
  t: number;
  lesson: boolean;
  done: boolean;
}

export type SoundCue = 'pettan' | 'hai' | 'tick' | 'don' | 'koto' | 'snicker' | 'throw' | 'notte';

export interface Sched {
  t: number;
  name: SoundCue;
  pitch: number;
}

export interface Span {
  t0: number;
  t1: number;
}

export interface LessonSpan extends Span {
  trick: Trick;
}

export interface Chart {
  notes: Note[];
  strikes: Strike[];
  sounds: Sched[];
  grins: Span[];
  aways: Span[];
  lessons: LessonSpan[];
  /** 「のってきた！」の時刻。 */
  excites: number[];
  end: number;
  /** つく回数。 */
  total: number;
}

export type Rand = () => number;

/** まつりばやし風の、くり返しのふし（A を 0 とした半音）。null は休み。 */
const TUNE: (number | null)[] = [0, 2, 0, -2, 0, -2, -5, null, -2, 0, 2, 5, 2, 0, -2, null];

/** 区切りの中で、いたずらを散らして並べる（いたずらは続けない。始めの 2 回はふつう）。 */
function arrange(section: Section, rand: Rand): ('hit' | Trick)[] {
  const t = section.tricks ?? {};
  const list: Trick[] = [];
  for (const kind of ['feint', 'fast', 'away', 'snow'] as const) {
    for (let k = 0; k < (t[kind] ?? 0); k++) list.push(kind);
  }
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  // ふつうの回数：はやつきは 2 回、ふりむき・雪玉は 1 回ぶんつく。フェイントはつかない
  const used = (t.fast ?? 0) * 2 + (t.away ?? 0) + (t.snow ?? 0);
  const plain = Math.max(0, section.strikes - used);
  const out: ('hit' | Trick)[] = [];
  const lead = Math.min(2, plain);
  for (let k = 0; k < lead; k++) out.push('hit');
  let rest = plain - lead;
  for (let k = 0; k < list.length; k++) {
    const left = list.length - k;
    // のこりを均等に分けて、すこしだけゆらす（いたずらの間にふつうを 1 回は入れる）
    const want = Math.round(rest / left + (rand() - 0.5) * 1.5);
    const g = Math.min(rest, Math.max(k > 0 ? 1 : 0, want));
    for (let n = 0; n < g; n++) out.push('hit');
    rest -= g;
    out.push(list[k]!);
  }
  for (let n = 0; n < rest; n++) out.push('hit');
  return out;
}

/** 面の譜面を作る。start は最初の音（前奏の 1 拍目）の時刻。 */
export function buildChart(stage: Stage, start: number, rand: Rand): Chart {
  const c: Chart = { notes: [], strikes: [], sounds: [], grins: [], aways: [], lessons: [], excites: [], end: 0, total: 0 };
  const key = Math.pow(2, stage.key / 12);
  const firstBeat = 60 / stage.sections[0]!.bpm;
  let t = start + firstBeat * 2;
  let tuneAt = 0;
  let snowmanNext = 0;
  const say = (at: number, name: SoundCue, pitch = 1): void => {
    c.sounds.push({ t: at, name, pitch });
  };
  const note = (at: number, kind: NoteKind, lead: number, lesson: boolean, early: number = JUDGE.earlyMiss): void => {
    const from = kind === 'snow' ? snowmanNext++ % 2 : 0;
    c.notes.push({ t: at, kind, lead, early, lesson, done: false, from });
  };
  const strike = (at: number, lesson: boolean): void => {
    c.strikes.push({ t: at, lesson, done: false });
    if (!lesson) c.total++;
  };

  /** 1 組（2 拍）を置く。 */
  const slot = (kind: 'hit' | Trick, b: number, lesson: boolean): void => {
    const early = Math.min(JUDGE.earlyMiss, b * 0.5);
    if (kind === 'feint') {
      c.grins.push({ t0: t - b * 0.25, t1: t + b * 1.35 });
      say(t - b * 0.25, 'snicker');
      note(t + b, 'feint', b * 1.25, lesson);
    } else if (kind === 'fast') {
      strike(t, lesson);
      strike(t + b, lesson);
      say(t, 'pettan', 1.12);
      say(t + b * 0.5, 'hai', 1.12);
      say(t + b, 'pettan', 1.12);
      say(t + b * 1.5, 'hai', 1.12);
      const e = Math.min(JUDGE.earlyMiss, b * 0.25);
      note(t + b * 0.5, 'fast', b * 1.5, lesson, e);
      note(t + b * 1.5, 'fast', b * 1.5, lesson, e);
    } else {
      strike(t, lesson);
      say(t, 'pettan');
      say(t + b, 'hai');
      if (kind === 'away') {
        c.aways.push({ t0: t - b * 0.8, t1: t + b * 1.2 });
        note(t + b, 'away', b * 1.25, lesson, early);
      } else {
        note(t + b, 'hit', b * 1.25, lesson, early);
      }
      if (kind === 'snow') {
        const at = t + b * 1.5;
        say(at - SNOW_FLIGHT, 'throw');
        note(at, 'snow', SNOW_LEAD, lesson, 0);
      }
    }
    if (!lesson) {
      // はやし：拍ごとの太鼓と、ふし
      for (let k = 0; k < 2; k++) {
        const at = t + k * b;
        say(at, 'don', k === 0 ? 1 : 1.2);
        const n = TUNE[tuneAt++ % TUNE.length] ?? null;
        if (n !== null) say(at, 'koto', key * Math.pow(2, n / 12));
      }
    }
    t += b * 2;
  };

  // 前奏（2 拍）
  say(t - firstBeat * 2, 'tick');
  say(t - firstBeat, 'tick');

  let prevBpm = stage.sections[0]!.bpm;
  for (const section of stage.sections) {
    const b = 60 / section.bpm;
    if (section.lesson) {
      // ゆっくり見せる（判定しない）→ 2 拍の合図で本番へ
      const slow = 60 / LESSON_BPM;
      const t0 = t;
      t += slow;
      slot(section.lesson, slow, true);
      t += slow * 0.5;
      c.lessons.push({ t0, t1: t, trick: section.lesson });
      say(t, 'tick');
      say(t + b, 'tick');
      t += b * 2;
    }
    if (section.bpm > prevBpm) {
      c.excites.push(t - b);
      say(t - b, 'notte');
    }
    prevBpm = section.bpm;
    for (const kind of arrange(section, rand)) slot(kind, b, false);
  }
  c.end = t + 60 / prevBpm;
  c.notes.sort((a, z) => a.t - z.t);
  c.sounds.sort((a, z) => a.t - z.t);
  return c;
}
