import { Container, Graphics } from 'pixi.js';

export interface PlayerSprite {
  container: Container;
  setFlipped(flip: boolean): void;
}

export function createPlayer(): PlayerSprite {
  const c = new Container();
  const body = new Graphics().roundRect(0, 8, 36, 38, 14).fill(0xc084fc).stroke({ color: 0x8b5cf6, width: 2 });
  const cap = new Graphics().roundRect(6, 0, 24, 14, 8).fill(0xf472b6);
  const eyeL = new Graphics().ellipse(13, 24, 3, 4).fill(0x1a1a2e);
  const eyeR = new Graphics().ellipse(25, 24, 3, 4).fill(0x1a1a2e);
  const cheek = new Graphics().ellipse(18, 34, 5, 2.5).fill(0xfbcfe8);
  cheek.alpha = 0.7;
  c.addChild(body, cap, eyeL, eyeR, cheek);
  c.pivot.set(18, 23);

  return {
    container: c,
    setFlipped(flip) { c.scale.x = flip ? -1 : 1; },
  };
}
