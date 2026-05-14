import { Container, Graphics, Text } from 'pixi.js';

export function showFailPopup(parent: Container, x: number, y: number) {
  const t = new Text({ text: '-3', style: { fontSize: 32, fontWeight: '800', fill: 0xef4444 } });
  t.x = x;
  t.y = y;
  parent.addChild(t);
  const start = performance.now();
  const tick = () => {
    const elapsed = performance.now() - start;
    t.alpha = Math.max(0, 1 - elapsed / 600);
    t.y -= 1;
    if (elapsed >= 600) {
      parent.removeChild(t);
      t.destroy();
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function flashCombo(parent: Container, combo: number) {
  if (combo % 5 !== 0 || combo === 0) return;
  const flash = new Graphics().rect(0, 0, 360, 780).fill({ color: combo >= 50 ? 0xfde68a : 0xfbbf24, alpha: 0.15 });
  parent.addChild(flash);
  const start = performance.now();
  const tick = () => {
    const elapsed = performance.now() - start;
    flash.alpha = Math.max(0, 0.15 - elapsed / 800);
    if (elapsed >= 300) {
      parent.removeChild(flash);
      flash.destroy();
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
