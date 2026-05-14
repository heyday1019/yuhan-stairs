import { Application } from 'pixi.js';

export interface StageHandle {
  app: Application;
  destroy(): void;
}

export async function createStage(canvas: HTMLCanvasElement, width: number, height: number): Promise<StageHandle> {
  const app = new Application();
  await app.init({
    canvas,
    width,
    height,
    backgroundColor: 0x0a0e27,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  return {
    app,
    destroy: () => app.destroy(true, { children: true, texture: true }),
  };
}
