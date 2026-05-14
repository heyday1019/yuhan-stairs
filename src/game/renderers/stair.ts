import { Container, Graphics, Text } from 'pixi.js';
import type { Stair } from '@/shared/types';
import { FLOOR_HEIGHT } from '../camera';

const LEFT_X = 60;
const RIGHT_X = 240;
const STAIR_W = 120;
const STAIR_H = 22;

export function renderStair(world: Container, stair: Stair): Container {
  const node = new Container();
  const x = stair.dir === 'L' ? LEFT_X : RIGHT_X;
  const y = -(stair.floor - 1) * FLOOR_HEIGHT;
  node.x = x;
  node.y = y;

  const shadow = new Graphics()
    .roundRect(0, 8, STAIR_W, 30, 6)
    .fill(0xa8895a);
  const top = new Graphics()
    .roundRect(0, 0, STAIR_W, STAIR_H, 6)
    .fill(stair.isBooster ? 0xfde68a : 0xf5e6c8)
    .stroke({ color: stair.isBooster ? 0xfbbf24 : 0xc8a87a, width: stair.isBooster ? 2 : 1 });
  node.addChild(shadow, top);

  if (stair.hasCoin) {
    const coin = new Graphics().circle(STAIR_W / 2, -16, 12).fill(0xfbbf24).stroke({ color: 0xd97706, width: 2 });
    node.addChild(coin);
  }
  if (stair.floor % 20 === 0) {
    const label = new Text({ text: `${stair.floor}F`, style: { fontSize: 10, fill: 0x5c4a2a, fontWeight: '700' } });
    label.x = STAIR_W - 28;
    label.y = 5;
    node.addChild(label);
  }
  world.addChild(node);
  return node;
}

export function renderVisibleStairs(world: Container, allStairs: Stair[], currentFloor: number): Map<number, Container> {
  const visible = new Map<number, Container>();
  const lo = Math.max(1, currentFloor - 5);
  const hi = Math.min(allStairs.length, currentFloor + 15);
  for (let f = lo; f <= hi; f++) {
    visible.set(f, renderStair(world, allStairs[f - 1]));
  }
  return visible;
}
