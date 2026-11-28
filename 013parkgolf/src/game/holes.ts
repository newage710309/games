// 9 つのホールのデータ（1 コース 3 ホール × 3 コース）。座標はコースを真上から見たもので、横は 0..480、
// 縦は 0（カップのある奥）.. h（ティーのある手前）。数値は試遊とボットで調整したもの。

import type { Hole, Shape } from './course';

const UP = -Math.PI / 2;
const R = 0;
const L = Math.PI;
const D = Math.PI / 2;

const poly = (...pts: number[]): Shape => ({ k: 'poly', pts, smooth: true });
const rect = (x: number, y: number, w: number, h: number): Shape => ({ k: 'poly', pts: [x, y, x + w, y, x + w, y + h, x, y + h] });
const circle = (x: number, y: number, r: number): Shape => ({ k: 'circle', x, y, r });
const band = (w: number, ...pts: number[]): Shape => ({ k: 'band', pts, w });

const empty = (): Pick<Hole, 'slopes' | 'obstacles' | 'roots' | 'snowmen' | 'tunnels' | 'hints'> => ({
  slopes: [],
  obstacles: [],
  roots: [],
  snowmen: [],
  tunnels: [],
  hints: []
});

// --- 1 めん：春の川辺のコース ---------------------------------------------------

/** 1-1 まっすぐのパー 3。カップの手前に右へ下るゆるい坂。坂を読めばホールインワンも出せる。 */
const H1: Hole = {
  ...empty(),
  name: 'さくら なみき',
  par: 3,
  h: 760,
  tee: { x: 240, y: 540 },
  cup: { x: 240, y: 170 },
  teeAim: UP,
  areas: [
    { surf: 'rough', shape: poly(110, 740, 370, 740, 420, 520, 410, 90, 240, 60, 70, 90, 60, 520) },
    { surf: 'fairway', shape: band(150, 240, 690, 240, 170) },
    { surf: 'water', look: 'pond', shape: poly(338, 238, 392, 236, 404, 290, 372, 330, 330, 312) }
  ],
  slopes: [{ shape: poly(130, 220, 350, 220, 360, 420, 130, 420), dir: R, g: 26 }],
  obstacles: [
    { k: 'tree', x: 112, y: 460, r: 24, v: 0 },
    { k: 'tree', x: 372, y: 560, r: 22, v: 1 },
    { k: 'rock', x: 128, y: 250, r: 11 }
  ],
  hints: [{ x: 240, y: 540, r: 60, text: 'カップの てまえ、右へ まがる 坂だよ' }]
};

/** 1-2 池のまわりを回るパー 4。近道すると池、坂は池のほうへ下る。 */
const H2: Hole = {
  ...empty(),
  name: 'かわせみの いけ',
  par: 4,
  h: 1000,
  tee: { x: 120, y: 920 },
  cup: { x: 340, y: 170 },
  teeAim: UP,
  areas: [
    { surf: 'rough', shape: poly(50, 980, 240, 990, 260, 760, 430, 620, 440, 90, 240, 70, 230, 400, 50, 560) },
    { surf: 'fairway', shape: band(130, 120, 930, 125, 640, 220, 520, 340, 430, 340, 170) },
    { surf: 'water', look: 'pond', shape: poly(150, 300, 220, 250, 280, 300, 270, 380, 200, 420, 150, 380) },
    { surf: 'water', look: 'pond', shape: poly(230, 640, 320, 610, 360, 680, 300, 740, 240, 720) }
  ],
  slopes: [
    { shape: poly(250, 480, 420, 440, 420, 300, 260, 300), dir: L, g: 30 },
    { shape: poly(170, 600, 260, 560, 300, 620, 220, 700), dir: R + 0.6, g: 24 }
  ],
  obstacles: [
    { k: 'tree', x: 70, y: 720, r: 22, v: 0 },
    { k: 'tree', x: 400, y: 520, r: 24, v: 1 },
    { k: 'tree', x: 300, y: 250, r: 18, v: 0 },
    { k: 'rock', x: 190, y: 830, r: 12 }
  ],
  hints: [
    { x: 120, y: 920, r: 60, text: 'いけの そばは 坂が 池へ 下ってるよ' },
    { x: 330, y: 420, r: 120, text: 'ここから 上は 左へ まがるよ' }
  ]
};

/** 1-3 川ぞいの長いパー 5。右の川へ下る坂と、まん中の木と池。 */
const H3: Hole = {
  ...empty(),
  name: 'はるの かわべ',
  par: 5,
  h: 1500,
  tee: { x: 150, y: 1420 },
  cup: { x: 290, y: 150 },
  teeAim: UP,
  areas: [
    {
      surf: 'rough',
      shape: poly(60, 1480, 300, 1480, 400, 1200, 350, 900, 400, 620, 380, 300, 400, 80, 200, 60, 90, 360, 80, 700, 110, 1000, 50, 1240)
    },
    { surf: 'fairway', shape: band(140, 150, 1430, 170, 1150, 250, 920, 200, 640, 260, 400, 290, 150) },
    { surf: 'water', look: 'river', shape: band(70, 470, 1500, 430, 1220, 375, 960, 430, 640, 410, 340, 470, 0) },
    { surf: 'water', look: 'pond', shape: poly(150, 260, 205, 238, 220, 290, 180, 320, 140, 300) }
  ],
  slopes: [
    { shape: poly(180, 1000, 340, 960, 340, 840, 180, 860), dir: R, g: 30 },
    { shape: poly(260, 700, 360, 660, 360, 520, 260, 540), dir: R - 0.3, g: 26 },
    { shape: poly(200, 260, 340, 240, 340, 120, 200, 120), dir: L, g: 18 }
  ],
  obstacles: [
    { k: 'tree', x: 250, y: 1180, r: 22, v: 0 },
    { k: 'tree', x: 110, y: 820, r: 24, v: 1 },
    { k: 'tree', x: 300, y: 780, r: 18, v: 0 },
    { k: 'tree', x: 150, y: 520, r: 22, v: 0 },
    { k: 'rock', x: 320, y: 440, r: 12 },
    { k: 'tree', x: 350, y: 230, r: 18, v: 1 }
  ],
  hints: [
    { x: 200, y: 1000, r: 140, text: 'このへんは 川へ 下ってるよ' },
    { x: 260, y: 400, r: 160, text: 'カップの まわりは 左へ まがるよ' }
  ]
};

// --- 2 めん：秋の森のコース --------------------------------------------------------

/** 2-1 小川の橋をわたって、坂で右へ曲がるパー 3。落ち葉がカップのまわりでボールを止める。坂を読めばホールインワンをねらえる。 */
const H4: Hole = {
  ...empty(),
  name: 'もみじの はし',
  par: 3,
  h: 760,
  tee: { x: 175, y: 560 },
  cup: { x: 310, y: 215 },
  teeAim: UP,
  areas: [
    { surf: 'rough', shape: poly(80, 745, 260, 745, 290, 560, 420, 380, 420, 110, 250, 90, 100, 330, 60, 560) },
    { surf: 'fairway', shape: band(120, 175, 570, 195, 530, 220, 470, 255, 340, 310, 215) },
    { surf: 'leaves', shape: circle(316, 166, 46) },
    { surf: 'water', look: 'stream', shape: band(26, 0, 486, 120, 470, 220, 490, 330, 462, 480, 480) },
    { surf: 'bridge', shape: rect(192, 460, 56, 54) }
  ],
  slopes: [{ shape: poly(170, 450, 290, 430, 300, 290, 190, 300), dir: R - 0.4, g: 30 }],
  obstacles: [
    { k: 'tree', x: 120, y: 300, r: 26, v: 0 },
    { k: 'tree', x: 380, y: 420, r: 22, v: 1 },
    { k: 'stump', x: 100, y: 590, r: 12 }
  ],
  roots: [
    { x1: 225, y1: 580, x2: 262, y2: 610, turn: 0.18 },
    { x1: 150, y1: 410, x2: 175, y2: 380, turn: -0.18 }
  ]
};

/** 2-2 S 字に曲がるパー 4。木の根のでこぼこと、坂と、落ち葉のしかけを組み合わせる。 */
const H5: Hole = {
  ...empty(),
  name: 'きのこの こみち',
  par: 4,
  h: 1060,
  tee: { x: 360, y: 980 },
  cup: { x: 130, y: 170 },
  teeAim: UP,
  areas: [
    { surf: 'rough', shape: poly(280, 1040, 440, 1030, 430, 760, 300, 560, 420, 340, 250, 80, 50, 100, 60, 360, 180, 560, 260, 760) },
    { surf: 'fairway', shape: band(118, 360, 990, 350, 770, 250, 600, 300, 420, 230, 280, 130, 170) },
    { surf: 'leaves', shape: poly(80, 240, 150, 220, 190, 280, 120, 320, 70, 300) },
    { surf: 'leaves', shape: circle(300, 520, 34) },
    { surf: 'water', look: 'stream', shape: band(24, 480, 700, 380, 690, 300, 714, 200, 680, 0, 700) },
    { surf: 'bridge', shape: rect(292, 660, 66, 80) }
  ],
  slopes: [
    { shape: poly(200, 520, 330, 480, 360, 380, 220, 380), dir: L + 0.4, g: 26 },
    { shape: poly(90, 260, 230, 230, 240, 110, 90, 110), dir: D, g: 16 }
  ],
  obstacles: [
    { k: 'tree', x: 230, y: 900, r: 24, v: 2 },
    { k: 'tree', x: 400, y: 600, r: 22, v: 0 },
    { k: 'tree', x: 190, y: 460, r: 20, v: 1 },
    { k: 'tree', x: 330, y: 250, r: 26, v: 2 },
    { k: 'stump', x: 280, y: 800, r: 12 }
  ],
  roots: [
    { x1: 260, y1: 610, x2: 300, y2: 560, turn: -0.22 },
    { x1: 290, y1: 640, x2: 340, y2: 600, turn: -0.22 },
    { x1: 230, y1: 360, x2: 270, y2: 330, turn: 0.2 },
    { x1: 250, y1: 390, x2: 300, y2: 360, turn: 0.2 }
  ]
};

/** 2-3 森をぬける長いパー 5。小川を 2 回わたる。橋はせまく、根がならぶ。 */
const H6: Hole = {
  ...empty(),
  name: 'もりの おく',
  par: 5,
  h: 1560,
  tee: { x: 240, y: 1480 },
  cup: { x: 330, y: 160 },
  teeAim: UP,
  areas: [
    {
      surf: 'rough',
      shape: poly(140, 1540, 340, 1540, 380, 1240, 280, 1020, 420, 820, 420, 560, 300, 380, 430, 220, 400, 70, 200, 90, 160, 380, 60, 600, 60, 860, 150, 1060, 100, 1300)
    },
    { surf: 'fairway', shape: band(118, 240, 1490, 240, 1240, 200, 1060, 260, 900, 340, 720, 250, 520, 230, 380, 330, 160) },
    { surf: 'leaves', shape: poly(160, 980, 230, 960, 250, 1010, 180, 1040) },
    { surf: 'leaves', shape: circle(330, 160, 44) },
    { surf: 'water', look: 'stream', shape: band(24, 0, 1150, 150, 1170, 260, 1140, 480, 1160) },
    { surf: 'bridge', shape: rect(212, 1116, 58, 50) },
    { surf: 'water', look: 'stream', shape: band(24, 0, 600, 200, 620, 330, 590, 480, 610) },
    { surf: 'bridge', shape: rect(278, 566, 56, 50) }
  ],
  slopes: [
    { shape: poly(260, 960, 380, 900, 380, 780, 260, 820), dir: L - 0.3, g: 28 },
    { shape: poly(180, 460, 300, 440, 300, 330, 180, 350), dir: R, g: 24 },
    { shape: poly(270, 240, 400, 240, 400, 110, 270, 110), dir: UP + 0.6, g: 14 }
  ],
  obstacles: [
    { k: 'tree', x: 320, y: 1330, r: 22, v: 1 },
    { k: 'tree', x: 130, y: 1220, r: 20, v: 2 },
    { k: 'tree', x: 200, y: 760, r: 26, v: 0 },
    { k: 'tree', x: 380, y: 640, r: 20, v: 2 },
    { k: 'tree', x: 150, y: 520, r: 22, v: 1 },
    { k: 'tree', x: 260, y: 270, r: 18, v: 0 },
    { k: 'stump', x: 300, y: 1000, r: 12 },
    { k: 'rock', x: 360, y: 440, r: 12 }
  ],
  roots: [
    { x1: 210, y1: 1300, x2: 270, y2: 1290, turn: 0.2 },
    { x1: 220, y1: 680, x2: 280, y2: 660, turn: -0.22 },
    { x1: 300, y1: 690, x2: 360, y2: 680, turn: 0.22 },
    { x1: 200, y1: 430, x2: 250, y2: 410, turn: 0.2 }
  ]
};

// --- 3 めん：冬のスノーパークゴルフ ------------------------------------------------

/** 3-1 氷の道のパー 3。雪だるまが 1 人横切る。カップの奥の雪が止めてくれるので、ホールインワンをねらえる。 */
const H7: Hole = {
  ...empty(),
  name: 'こおりの みち',
  fairwayDrag: 1.6,
  par: 3,
  h: 800,
  tee: { x: 240, y: 720 },
  cup: { x: 240, y: 190 },
  teeAim: UP,
  areas: [
    { surf: 'snow', shape: poly(100, 780, 380, 780, 410, 500, 400, 90, 240, 70, 80, 90, 70, 500) },
    { surf: 'fairway', shape: band(140, 240, 730, 240, 190) },
    { surf: 'ice', shape: poly(200, 620, 280, 620, 300, 400, 270, 250, 210, 250, 180, 400) },
    { surf: 'snow', shape: poly(170, 160, 310, 160, 330, 100, 150, 100) }
  ],
  slopes: [{ shape: poly(190, 380, 300, 380, 300, 290, 190, 290), dir: R, g: 12 }],
  obstacles: [
    { k: 'tree', x: 110, y: 400, r: 22, v: 0 },
    { k: 'tree', x: 380, y: 300, r: 20, v: 0 },
    { k: 'rock', x: 350, y: 610, r: 12 }
  ],
  snowmen: [{ x1: 160, y1: 430, x2: 320, y2: 430, period: 4.4, phase: 0 }]
};

/** 3-2 かまくらのトンネルのパー 4。雪の山を回るか、かまくらを通って近道するか。 */
const H8: Hole = {
  ...empty(),
  name: 'かまくら むら',
  fairwayDrag: 1.6,
  par: 4,
  h: 1080,
  tee: { x: 120, y: 1000 },
  cup: { x: 340, y: 170 },
  teeAim: UP,
  areas: [
    { surf: 'snow', shape: poly(50, 1060, 260, 1060, 300, 820, 440, 640, 440, 80, 240, 70, 220, 420, 50, 600) },
    { surf: 'fairway', shape: band(124, 120, 1010, 130, 700, 250, 600, 360, 480, 340, 170) },
    { surf: 'ice', shape: poly(260, 560, 330, 520, 390, 560, 360, 640, 280, 640) },
    { surf: 'snow', shape: poly(170, 440, 260, 380, 300, 460, 240, 540, 170, 520) },
    { surf: 'ice', shape: poly(300, 400, 390, 400, 390, 250, 300, 250) }
  ],
  slopes: [
    { shape: poly(290, 410, 400, 410, 400, 240, 290, 240), dir: L + 0.3, g: 14 },
    { shape: poly(250, 650, 400, 650, 400, 510, 250, 510), dir: R + 0.2, g: 16 }
  ],
  obstacles: [
    { k: 'tree', x: 70, y: 800, r: 22, v: 0 },
    { k: 'tree', x: 230, y: 860, r: 20, v: 0 },
    { k: 'tree', x: 410, y: 420, r: 20, v: 0 },
    { k: 'rock', x: 280, y: 240, r: 12 }
  ],
  snowmen: [
    { x1: 220, y1: 640, x2: 330, y2: 700, period: 5, phase: 0.2 },
    { x1: 290, y1: 330, x2: 400, y2: 330, period: 3.6, phase: 0.6 },
    { x1: 80, y1: 880, x2: 190, y2: 880, period: 3.2, phase: 0 }
  ],
  tunnels: [{ ix: 130, iy: 790, face: D, ox: 300, oy: 520, dir: UP - 0.2 }]
};

/** 3-3 ゆきやまの長いパー 5。氷・雪・雪だるま・かまくらの見せ場。 */
const H9: Hole = {
  ...empty(),
  name: 'ゆきやま だいかいせん',
  fairwayDrag: 1.6,
  par: 5,
  h: 1620,
  tee: { x: 240, y: 1540 },
  cup: { x: 140, y: 170 },
  teeAim: UP,
  areas: [
    {
      surf: 'snow',
      shape: poly(140, 1600, 340, 1600, 400, 1300, 300, 1100, 430, 900, 420, 640, 300, 480, 340, 300, 260, 80, 60, 90, 80, 420, 160, 560, 60, 820, 90, 1100, 160, 1300)
    },
    { surf: 'fairway', shape: band(120, 240, 1550, 250, 1300, 200, 1120, 330, 900, 340, 700, 220, 560, 230, 380, 140, 170) },
    { surf: 'ice', shape: poly(180, 1240, 290, 1240, 300, 1140, 190, 1140) },
    { surf: 'ice', shape: poly(280, 860, 380, 840, 390, 680, 290, 700) },
    { surf: 'ice', shape: poly(170, 320, 270, 320, 250, 200, 110, 220) },
    { surf: 'snow', shape: poly(80, 140, 200, 120, 200, 70, 80, 80) }
  ],
  obstacles: [
    { k: 'tree', x: 330, y: 1420, r: 20, v: 0 },
    { k: 'tree', x: 120, y: 1000, r: 24, v: 0 },
    { k: 'tree', x: 230, y: 780, r: 22, v: 0 },
    { k: 'tree', x: 370, y: 520, r: 20, v: 0 },
    { k: 'rock', x: 300, y: 300, r: 12 },
    { k: 'tree', x: 90, y: 300, r: 18, v: 0 }
  ],
  slopes: [
    { shape: poly(110, 330, 280, 330, 280, 200, 110, 200), dir: L + 0.5, g: 13 },
    { shape: poly(270, 880, 400, 860, 400, 680, 270, 700), dir: R, g: 18 },
    { shape: poly(170, 1250, 310, 1250, 310, 1130, 170, 1130), dir: L - 0.2, g: 15 }
  ],
  snowmen: [
    { x1: 170, y1: 1180, x2: 320, y2: 1180, period: 4.2, phase: 0 },
    { x1: 270, y1: 640, x2: 390, y2: 600, period: 3.8, phase: 0.4 },
    { x1: 150, y1: 420, x2: 300, y2: 420, period: 4.6, phase: 0.75 }
  ],
  tunnels: [{ ix: 140, iy: 900, face: D + 0.3, ox: 275, oy: 520, dir: UP - 0.35 }]
};

export const HOLES: readonly Hole[] = [H1, H2, H3, H4, H5, H6, H7, H8, H9];
