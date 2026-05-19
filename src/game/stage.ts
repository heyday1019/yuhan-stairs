import { Application, Assets, Texture } from 'pixi.js';
import { CHARACTERS } from './characters';

export interface CharacterTextures {
  idle: Texture;
  jump: Texture;
}

export interface StageTextures {
  stair: Texture;
  characters: Map<string, CharacterTextures>;
}

export interface StageHandle {
  app: Application;
  textures: StageTextures;
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
  app.stage.sortableChildren = true;

  const stairLoad = Assets.load<Texture>('/stair.png');
  const charLoads = CHARACTERS.flatMap((c) => [
    Assets.load<Texture>(c.idle),
    Assets.load<Texture>(c.jump),
  ]);
  const [stair, ...charTextures] = await Promise.all([stairLoad, ...charLoads]);
  const characters = new Map<string, CharacterTextures>();
  CHARACTERS.forEach((c, i) => {
    characters.set(c.id, { idle: charTextures[i * 2], jump: charTextures[i * 2 + 1] });
  });

  return {
    app,
    textures: { stair, characters },
    // Don't pass texture:true — Assets owns these textures and force-destroying them
    // leaves dangling references in the Assets cache (see commit history for the
    // "Cannot read properties of null (reading 'split')" incident).
    destroy: () => app.destroy(true, { children: true }),
  };
}
