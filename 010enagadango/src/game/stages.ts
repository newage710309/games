// 面と問題のデータ。問題はソルバー（solver.ts）ですべての置き方を試して、解けること・★★★ が取れることを確かめてある。
// 数値は README の「ソルバーでの確認結果」と合わせて見る。
import type { BirdKind } from './birds';
import type { Arrival, Order, Puzzle } from './rules';

const b = (bird: BirdKind, order?: Order): Arrival => (order ? { kind: 'bird', bird, order } : { kind: 'bird', bird });
const near = (who: BirdKind): Order => ({ type: 'near', who });
const avoid = (who: BirdKind): Order => ({ type: 'avoid', who });
const edge: Order = { type: 'edge' };
/** 雪玉：pos の場所に、おもさ weight の雪になって積もる。 */
const ball = (pos: number, weight: number): Arrival => ({ kind: 'snowball', pos, weight });

export interface Stage {
  name: string;
  /** 面の始めに出す一言。 */
  intro: string;
  puzzles: Puzzle[];
}

export const STAGES: Stage[] = [
  {
    name: '森の入り口',
    intro: '枝の 真ん中が さくらちゃんの 場所',
    puzzles: [
      // 1-1
      {
        perSide: 3,
        limit: 9,
        snow: [],
        queue: [b('yamagara'), b('enaga'), b('enaga'), b('gojukara')],
        hint: 'ヤマガラ（おもさ 2）は、エナガ 2 わぶん'
      },
      // 1-2
      {
        perSide: 3,
        limit: 9,
        snow: [],
        queue: [b('enaga'), b('gojukara'), b('akagera'), b('enaga')],
        hint: 'とおくに とまるほど、枝を つよく おす'
      },
      // 1-3
      {
        perSide: 3,
        limit: 9,
        snow: [],
        queue: [b('yamagara'), b('gojukara', near('yamagara')), b('yamagara'), b('gojukara', near('yamagara'))],
        hint: '「となりがいい」の 注文も かなえてあげよう'
      },
      // 1-4
      {
        perSide: 3,
        limit: 9,
        snow: [],
        queue: [b('karasu'), b('enaga'), b('akagera', edge), b('enaga', avoid('karasu')), b('karasu')],
        hint: 'はしっこが すきな 鳥、カラスが こわい 鳥'
      }
    ]
  },
  {
    name: '雪の谷',
    intro: '雪が 積もって いるよ',
    puzzles: [
      // 2-1
      {
        perSide: 4,
        limit: 7,
        snow: [{ pos: 3, weight: 1 }],
        queue: [b('gojukara'), b('enaga'), b('enaga'), b('yamagara')],
        hint: '積もった 雪にも おもさが ある'
      },
      // 2-2
      {
        perSide: 4,
        limit: 7,
        snow: [{ pos: 4, weight: 1 }, { pos: -1, weight: 2 }],
        queue: [b('yamagara'), b('enaga'), b('yamagara'), b('gojukara', near('yamagara')), b('enaga')],
        hint: '雪の 場所には とまれないよ'
      },
      // 2-3
      {
        perSide: 4,
        limit: 7,
        snow: [{ pos: -1, weight: 1 }],
        queue: [b('karasu'), b('yamagara'), b('yamagara', near('gojukara')), b('gojukara'), b('enaga'), b('enaga', avoid('karasu'))],
        hint: '雪と 注文、どちらも 気にして'
      },
      // 2-4
      {
        perSide: 4,
        limit: 7,
        snow: [{ pos: 3, weight: 2 }],
        queue: [b('karasu'), b('yamagara', near('gojukara')), b('enaga', avoid('karasu')), b('gojukara'), b('gojukara'), b('enaga')],
        hint: 'さきに 来る 鳥で、あとの 場所を あけておこう'
      },
      // 2-5
      {
        perSide: 4,
        limit: 7,
        snow: [{ pos: -4, weight: 2 }, { pos: -3, weight: 1 }],
        queue: [b('akagera', edge), b('yamagara', near('gojukara')), b('karasu'), b('gojukara'), b('gojukara'), b('enaga', avoid('karasu'))],
        hint: '雪の 谷の さいごの もんだい'
      }
    ]
  },
  {
    name: '夕暮れの森',
    intro: '雪だるまが 雪玉を 投げてくる！',
    puzzles: [
      // 3-1
      {
        perSide: 4,
        limit: 5,
        snow: [],
        queue: [b('enaga'), b('enaga'), b('gojukara'), ball(-4, 2), b('yamagara'), b('enaga')],
        hint: '雪玉が 来る 場所には とまれない。落ちても かたむきすぎないように'
      },
      // 3-2
      {
        perSide: 4,
        limit: 5,
        snow: [],
        queue: [b('gojukara'), ball(1, 1), b('enaga'), b('enaga'), b('gojukara'), b('yamagara', near('gojukara'))],
        hint: '雪玉が 来る じゅんばんも 見ておこう'
      },
      // 3-3
      {
        perSide: 4,
        limit: 5,
        snow: [{ pos: -2, weight: 1 }],
        queue: [b('enaga'), ball(1, 2), b('gojukara'), b('enaga', avoid('karasu')), b('karasu'), b('yamagara', near('gojukara')), b('enaga')],
        hint: 'かたむきの 余裕が 小さいよ'
      },
      // 3-4
      {
        perSide: 4,
        limit: 5,
        snow: [],
        queue: [b('enaga'), b('yamagara'), b('enaga', avoid('karasu')), ball(-3, 1), ball(-4, 1), b('enaga'), b('karasu'), b('gojukara', near('yamagara'))],
        hint: '雪玉が 2 こ つづけて 来る'
      },
      // 3-5
      {
        perSide: 4,
        limit: 5,
        snow: [],
        queue: [b('gojukara'), b('karasu'), b('enaga', avoid('karasu')), b('enaga'), b('enaga'), ball(-3, 1), b('yamagara', near('gojukara')), b('yamagara')],
        hint: 'さいごの もんだい。みんなで だんごに なろう'
      }
    ]
  }
];

/** 全部の問題を通し番号で。 */
export const ALL_PUZZLES: { stage: number; index: number; puzzle: Puzzle }[] = STAGES.flatMap((st, s) =>
  st.puzzles.map((puzzle, index) => ({ stage: s, index, puzzle }))
);

/** 得点。 */
export const SCORE = {
  clear: 300,
  /** 「ひとつもどす」も失敗もなし。 */
  clean: 200,
  /** ★★ に加えて、すき間なしのだんご。 */
  dango: 300,
  stageClear: 500
} as const;
