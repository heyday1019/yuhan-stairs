import type { Container } from 'pixi.js';

// Maps logical floor to screen y. Player anchored at PLAYER_Y, world scrolls.
export const FLOOR_HEIGHT = 50;
export const PLAYER_Y = 480;   // px from canvas top
export const RENDER_RADIUS = 15;

export function setCameraToFloor(world: Container, currentFloor: number) {
  world.y = PLAYER_Y - (currentFloor - 1) * -FLOOR_HEIGHT - FLOOR_HEIGHT;
}
