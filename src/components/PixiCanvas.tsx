'use client';
import { useEffect, useRef } from 'react';
import { createStage, type StageHandle, type StageTextures } from '@/game/stage';
import type { Application } from 'pixi.js';

export function PixiCanvas({ width, height, onReady }: {
  width: number;
  height: number;
  onReady: (app: Application, textures: StageTextures) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<StageHandle | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    (async () => {
      const handle = await createStage(canvasRef.current!, width, height);
      if (cancelled) { handle.destroy(); return; }
      handleRef.current = handle;
      onReady(handle.app, handle.textures);
    })();
    return () => {
      cancelled = true;
      // Defer destroy. React 19 dev StrictMode mounts→cleans→remounts synchronously,
      // and PIXI Application + Assets share a global cache — tearing down then immediately
      // re-initing on the same canvas leaves the resolver in a stale state (the
      // "Cannot read properties of null (reading 'split')" symptom). If a fresh handle is
      // installed before this timer fires, the unmount was a dev double-mount and we
      // skip the destroy entirely.
      const h = handleRef.current;
      handleRef.current = null;
      setTimeout(() => {
        if (handleRef.current !== h) h?.destroy();
      }, 1000);
    };
  }, [width, height, onReady]);

  return <canvas ref={canvasRef} style={{ width, height, touchAction: 'none' }} />;
}
