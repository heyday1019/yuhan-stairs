'use client';
import { useEffect, useRef } from 'react';
import { createStage, type StageHandle } from '@/game/stage';
import type { Application } from 'pixi.js';

export function PixiCanvas({ width, height, onReady }: {
  width: number;
  height: number;
  onReady: (app: Application) => void;
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
      onReady(handle.app);
    })();
    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, [width, height, onReady]);

  return <canvas ref={canvasRef} style={{ width, height, touchAction: 'none' }} />;
}
