import { drawRoom, drawTableFront, drawCounter, drawTray, drawHint } from './kitchen';
import { drawChef } from './chef';
import { drawKid, drawBubble, kidHeight, type KidKind } from './kids';
import { drawSnowman } from './snowman';
import { drawPot, drawBowl, piece } from './food';
import { SEAT_XS, SEAT_Y, bowlLayout, potLayout } from './constants';
import { STAGES } from './stages';
import { text, rr } from './ui';

// 給食が終わったあとのカウンターも、普段と同じ道具を使って描く。
function drawCountertop(ctx: CanvasRenderingContext2D, stage: number, time: number): void {
  drawCounter(ctx, stage);
  drawTray(ctx);
  const foods = STAGES[stage - 1].foods;
  bowlLayout(foods.length).forEach(slot => drawBowl(ctx, slot.bowl, { food: null, fill: 0, marks: stage === 1 ? 1 : 0.35, t: time }));
  potLayout(foods.length).forEach((pot, i) => drawPot(ctx, pot, foods[i], {
    left: 0.14 + i * 0.03, low: false, pressed: false, t: time
  }));
}

function drawSeated(ctx: CanvasRenderingContext2D, stage: number, time: number, finale: boolean): void {
  const guests: KidKind[] = finale
    ? ['enaga', 'kitsune', 'kuma', 'snowman', 'usagi', 'risu']
    : ['risu', 'usagi', 'enaga', 'kuma', 'yamagara', 'kitsune'];
  guests.forEach((kind, i) => drawKid(ctx, SEAT_XS[i], SEAT_Y, kind, {
    reaction: finale || time >= 2 ? 'eat' : 'happy', size: 0.65, t: time + i
  }));
  drawTableFront(ctx, stage);
  if (finale) {
    // 小さな器をテーブルの上に置く。
    guests.forEach((_, i) => drawBowl(ctx, { x: SEAT_XS[i] - 15, y: SEAT_Y - 24, w: 30, h: 18 }, {
      food: 'kakigori', fill: 0.55, marks: 0, t: time
    }));
  }
}

// 時間に応じて人物を動かす。タップで途中からでも次へ進める。
export function drawDemo(ctx: CanvasRenderingContext2D, stage: number, time: number, ending: boolean): void {
  drawRoom(ctx, stage, time);
  const finale = ending && time >= 9;
  drawSeated(ctx, stage, time, finale);
  drawCountertop(ctx, stage, time);

  if (ending) {
    if (finale) {
      drawChef(ctx, 90, 318, { pose: 'eat', food: 'kakigori', t: time });
      drawBubble(ctx, 'みんなで いただきます！', 250, 110, 240, 150, 15);
      rr(ctx, 145, 455, 190, 52, 14); ctx.fillStyle = 'rgba(15,23,48,.86)'; ctx.fill();
      text(ctx, 'おしまい', 240, 481, 28, '#ffffff', true);
    } else {
      // 鍋を持ち上げて右へ歩き、熱さで溶ける。
      const moving = Math.min(1, Math.max(0, (time - 0.5) / 2));
      const x = 245 + moving * 70;
      const melt = time < 2.5 ? 0 : time < 4.5 ? Math.min(0.85, (time - 2.5) * 0.43) : Math.max(0, 0.85 - (time - 4.5) * 0.3);
      drawChef(ctx, 78, 318, { pose: 'serve', gaze: 1, t: time });
      drawKid(ctx, 155, 318, 'kitsune', { reaction: 'fidget', size: 0.7, t: time });
      drawKid(ctx, 395, 318, 'kuma', { reaction: 'fidget', size: 0.55, t: time });
      drawKid(ctx, 450, 318, 'enaga', { reaction: 'happy', t: time });
      drawSnowman(ctx, x, 318, { scale: 2.8, melt, lift: time < 4.5 ? 10 : 0 });
      if (time < 4.5) {
        drawPot(ctx, { x: x - 44, y: 195, w: 88, h: 72 }, 'stew', { left: 0.25, low: false, pressed: false, t: time });
        // 両腕の先を鍋の両端に添える。
        ctx.strokeStyle = '#7a5536'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 24, 275); ctx.lineTo(x - 48, 230); ctx.moveTo(x + 24, 275); ctx.lineTo(x + 48, 230); ctx.stroke();
        drawBubble(ctx, time < 2.5 ? 'おかわり！' : 'あついよ〜！', x, 145, x, 213, 15);
      } else {
        drawBubble(ctx, 'かき氷で たすけよう！', 110, 155, 78, 242, 15);
        // ４人のそれぞれの位置から雪だるまに向かってつぶを投げる。
        const throwers = [{ x: 78, y: 265 }, { x: 155, y: 270 }, { x: 395, y: 262 }, { x: 450, y: 278 }];
        throwers.forEach((start, i) => {
          for (let j = 0; j < 3; j++) {
            const phase = ((time - 4.5) * 0.8 + i * 0.19 + j * 0.3) % 1;
            const px = start.x + (x - start.x) * phase;
            const py = start.y + (245 - start.y) * phase - Math.sin(Math.PI * phase) * 50;
            piece(ctx, 'kakigori', px, py, 8, i + j);
          }
        });
      }
    }
  } else if (stage === 1) {
    // いただきます → クマがおかわりに並びかける → しょんぼり帰りかける
    // → さくらちゃんが「ちょっとだけよ」とよそってあげる → クマがよろこんで食べる
    const leaving = time >= 4 && time < 5;
    const calling = time >= 5 && time < 6.6;
    const eating = time >= 6.6;
    drawChef(ctx, 100, 318, {
      pose: time < 2 ? 'cheer' : calling ? 'serve' : eating ? 'cheer' : 'serve',
      gaze: calling ? 1 : undefined,
      t: time
    });
    if (time < 2) drawBubble(ctx, 'いただきます！', 240, 115, 240, 175, 18);
    else {
      // クマは右から歩いてきて、帰りかけて、呼ばれてカウンターへもどる
      const x = time < 4 ? Math.min(300, 170 + (time - 2) * 65)
        : leaving ? 300 + (time - 4) * 70
        : Math.max(250, 370 - (time - 5) * 120);
      const reaction = leaving ? 'sad' : eating ? 'eat' : calling ? 'happy' : 'normal';
      drawKid(ctx, x, 318, 'kuma', { tray: true, reaction, t: time });
      // お盆の上の小さな器に、ちょっとだけ（すくなめ）よそわれる
      if (time >= 5.6) {
        const fill = Math.min(0.3, (time - 5.6) * 0.3);
        drawBowl(ctx, { x: x - 20, y: 318 - 64, w: 40, h: 22 }, { food: 'soup', fill, marks: 0, pouring: time < 6.6, t: time });
      }
      const top = 318 - kidHeight('kuma');
      if (time < 4) drawBubble(ctx, 'おかわり…', x, top - 28, x, top - 4, 15);
      else if (calling) drawBubble(ctx, 'ちょっとだけよ', 150, 200, 112, 248, 15);
      else if (eating) drawBubble(ctx, 'ありがとう！', x + 20, top - 28, x + 10, top - 4, 15);
    }
  } else {
    // よそ見と振り向きを２回繰り返し、見られた間は雪だるまが止まる。
    const cycle = Math.min(time, 7.99);
    const looking = cycle >= 2 && cycle < 3 || cycle >= 5 && cycle < 6;
    const distance = Math.min(cycle, 2) * 14 + Math.min(Math.max(cycle - 3, 0), 2) * 14;
    const x = 480 - distance;
    drawChef(ctx, 100, 318, { pose: 'serve', gaze: looking ? 1 : -1, t: time });
    if (looking) drawBubble(ctx, '！', 132, 190, 110, 242, 18);
    rr(ctx, 55, 70, 370, 90, 12); ctx.fillStyle = '#315c4d'; ctx.fill();
    text(ctx, 'あしたは ゆきまつりの', 240, 100, 17, '#fff', true);
    text(ctx, 'とくべつ きゅうしょく', 240, 130, 17, '#fff', true);
    drawKid(ctx, 250, 318, 'risu', { tray: true });
    drawKid(ctx, 320, 318, 'usagi', { tray: true });
    drawSnowman(ctx, x, 318, { scale: 2.2, hop: looking ? 0 : Math.sin(time * 6), face: looking ? 0 : -1, grin: looking });
  }
  drawHint(ctx, 'タップで つぎへ', 349);
}
