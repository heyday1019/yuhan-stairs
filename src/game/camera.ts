import type { Container } from 'pixi.js';

export const FLOOR_HEIGHT = 50;
export const PLAYER_Y = 480;
export const RENDER_RADIUS = 15;

export function targetWorldY(currentFloor: number): number {
  return PLAYER_Y - (currentFloor - 1) * -FLOOR_HEIGHT - FLOOR_HEIGHT;
}

export function comboLerpSpeed(combo: number): number {
  if (combo >= 50) return 0.6;
  if (combo >= 20) return 0.4;
  if (combo >= 10) return 0.25;
  if (combo >= 5) return 0.15;
  return 0.12;
}

export function lerpCameraToFloor(world: Container, currentFloor: number, combo: number): void {
  const target = targetWorldY(currentFloor);
  const t = comboLerpSpeed(combo);
  world.y = world.y + (target - world.y) * t;
}

export function setCameraToFloor(world: Container, currentFloor: number): void {
  world.y = targetWorldY(currentFloor);
}
