import { Container, Sprite, Texture } from 'pixi.js';

export interface PlayerSprite {
  container: Container;
  setFlipped(flip: boolean): void;
  jump(now: number): void;
  update(now: number): void;
}

const PLAYER_WIDTH = 56;
const JUMP_DURATION_MS = 180;
const JUMP_HEIGHT_PX = 14;

export function createPlayer(idleTex: Texture, jumpTex: Texture): PlayerSprite {
  const c = new Container();
  const sprite = new Sprite(idleTex);
  // Anchor at center-bottom so the foot stays planted on the stair across texture swaps.
  sprite.anchor.set(0.5, 1);
  c.addChild(sprite);
  c.zIndex = 10000;

  let flipped = false;
  let jumpStartedAt: number | null = null;

  function applyTexture(tex: Texture) {
    const baseScale = PLAYER_WIDTH / tex.width;
    sprite.texture = tex;
    sprite.scale.set(baseScale * (flipped ? -1 : 1), baseScale);
  }

  applyTexture(idleTex);

  return {
    container: c,
    setFlipped(flip) {
      if (flipped === flip) return;
      flipped = flip;
      sprite.scale.x = Math.abs(sprite.scale.x) * (flipped ? -1 : 1);
    },
    jump(now) {
      jumpStartedAt = now;
      applyTexture(jumpTex);
    },
    update(now) {
      if (jumpStartedAt === null) {
        sprite.y = 0;
        return;
      }
      const t = (now - jumpStartedAt) / JUMP_DURATION_MS;
      if (t >= 1) {
        jumpStartedAt = null;
        applyTexture(idleTex);
        sprite.y = 0;
        return;
      }
      // Parabolic arc — peak at t=0.5.
      sprite.y = -Math.sin(t * Math.PI) * JUMP_HEIGHT_PX;
    },
  };
}
