import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { Stair } from '@/shared/types';
import { FLOOR_HEIGHT } from '../camera';

// Stair x-coordinate spans 0..240 (canvas 360 - stair width 120), so width must remain 120.
// Sprite preserves the source 1271×1237 aspect ratio (~1:0.97). The top ~22px of the sprite
// is treated as the "tread" — anything visually above that is the cube body extending upward.
const STAIR_W = 120;
const STAIR_SPRITE_H = 117;
const TREAD_BAND = 22;       // matches the legacy tread height for player y math
const SPRITE_Y_OFFSET = -(STAIR_SPRITE_H - TREAD_BAND); // pushes cube body up so tread sits at y=0..22

export function renderStair(world: Container, stair: Stair, tex: Texture): Container {
  const node = new Container();
  node.x = stair.x;
  node.y = -(stair.floor - 1) * FLOOR_HEIGHT;
  // Lower floors draw on top so the player's perspective (looking up the climb) is preserved.
  node.zIndex = -stair.floor;

  const sprite = new Sprite(tex);
  sprite.width = STAIR_W;
  sprite.height = STAIR_SPRITE_H;
  sprite.y = SPRITE_Y_OFFSET;
  if (stair.isBooster) sprite.tint = 0xfde68a;
  node.addChild(sprite);

  if (stair.hasCoin) {
    const coin = new Graphics().circle(STAIR_W / 2, -32, 12).fill(0xfbbf24).stroke({ color: 0xd97706, width: 2 });
    node.addChild(coin);
  }
  if (stair.floor % 20 === 0) {
    const label = new Text({ text: `${stair.floor}F`, style: { fontSize: 10, fill: 0xe0e7ff, fontWeight: '700' } });
    label.x = STAIR_W - 28;
    label.y = 5;
    node.addChild(label);
  }
  world.addChild(node);
  return node;
}

export function renderVisibleStairs(world: Container, allStairs: Stair[], currentFloor: number, stairTex: Texture): Map<number, Container> {
  const visible = new Map<number, Container>();
  const lo = Math.max(1, currentFloor - 5);
  const hi = Math.min(allStairs.length, currentFloor + 15);
  for (let f = lo; f <= hi; f++) {
    visible.set(f, renderStair(world, allStairs[f - 1], stairTex));
  }
  return visible;
}
