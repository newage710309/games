import { COLS, ROWS } from './constants';

/**
 * 面の定義。迷路は固定で、1 文字が 1 マス。
 *   .  なにもない（雪の地面）
 *   #  氷のブロック
 *   E  雪だるまの卵が入った氷のブロック（面の始めに点滅して場所を教える）
 *   F  E と同じだが、面の始めに必ず最初にかえる（序盤をやさしくするための「つぶしやすい」位置に置く）
 *   P  さくらちゃんのスタート位置（なにもないマス）
 */
export interface Stage {
  readonly title: string;
  readonly maze: readonly string[];
  /** 雪だるまの速さ（マス／秒）。 */
  readonly enemySpeed: number;
  /** 同時に盤面に出てくる雪だるまの数。残りは卵のまま待つ。 */
  readonly maxActive: number;
  /** 分かれ道で、さくらちゃんに近づく向きを選ぶ確率（残りはでたらめに歩く）。 */
  readonly chase: number;
  /** 分かれ道で、さくらちゃんのほうにある氷を壊しにいく確率。 */
  readonly breakChance: number;
  /** 幕間デモの題名（この面をクリアしたあとに流れる）。 */
  readonly demoTitle: string;
}

export const STAGES: readonly Stage[] = [
  {
    title: 'ゆきのはら',
    maze: [
      '.........',
      '.##.#.##.',
      '.#E.#.E#.',
      '.........',
      '###...###',
      'F..#P#..F', // 最初の 2 体は段の両端から。段の上下は氷でふさいであるので、
      '###...###', // 段の中を行き来する。スタートの左右の氷を押せばつぶせる
      '.........',
      '.#..#..#.',
      '.##.#.##.',
      '....E....'
    ],
    enemySpeed: 2.0,
    maxActive: 2,
    chase: 0.35,
    breakChance: 0.05,
    demoTitle: 'ころころ ゆきだるま'
  },
  {
    title: 'こおりのめいろ',
    maze: [
      '...#....E',
      '.#.#.##.#',
      '.#....#..',
      '.##E.###.',
      '...E...#.',
      '##.#P#...',
      '...#.###.',
      '.#.....E.',
      '.####.##.',
      '.E..#....',
      '...#E.##E'
    ],
    enemySpeed: 2.4,
    maxActive: 3,
    chase: 0.5,
    breakChance: 0.1,
    demoTitle: 'おいかけっこ'
  },
  {
    title: 'はるをまつもり',
    maze: [
      '....E....',
      '.##.#.##.',
      '.#E...E#.',
      '..##.##..',
      '#..E.E..#',
      '##..P..##',
      '#..#.#..#',
      '..#E.E#..',
      '.##...##.',
      '.E..#..E.',
      '...###...'
    ],
    enemySpeed: 2.7,
    maxActive: 3,
    chase: 0.6,
    breakChance: 0.15,
    demoTitle: 'はるが きた'
  }
];

// 迷路の大きさが盤面と合っているかを、読み込み時に確かめる（書き間違いの早期発見用）。
for (const [i, s] of STAGES.entries()) {
  if (s.maze.length !== ROWS || s.maze.some((r) => r.length !== COLS)) {
    throw new Error(`STAGE ${i + 1} の迷路の大きさが ${COLS}×${ROWS} ではありません`);
  }
  if (s.maze.join('').split('P').length !== 2) {
    throw new Error(`STAGE ${i + 1} のスタート位置（P）はちょうど 1 つにしてください`);
  }
}
