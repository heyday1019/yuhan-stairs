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

export function showBeanstalkJump(parent: Container, _fromFloor: number, _toFloor: number) {
  const text = new Text({ text: '🌱 +5!', style: { fontSize: 28, fontWeight: '800', fill: 0x66ff66 } });
  text.x = 100;
  text.y = 200;
  parent.addChild(text);
  const start = performance.now();
  const tick = () => {
    const t = (performance.now() - start) / 800;
    if (t >= 1) {
      parent.removeChild(text);
      text.destroy();
      return;
    }
    text.y = 200 - t * 60;
    text.alpha = 1 - t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function showShieldFlash(parent: Container) {
  const text = new Text({ text: '🛡️ 실드!', style: { fontSize: 24, fontWeight: '800', fill: 0xffff66 } });
  text.x = 100;
  text.y = 240;
  parent.addChild(text);
  setTimeout(() => {
    parent.removeChild(text);
    text.destroy();
  }, 700);
}
