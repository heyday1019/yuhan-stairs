'use client';
import { useEffect, useRef } from 'react';
import { useGame } from '@/game/store';
import { attachInput } from '@/game/input';

export function InputOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  const handleTap = useGame((s) => s.handleTap);

  useEffect(() => {
    if (!ref.current) return;
    const div = ref.current;
    const fakeCanvas = div as unknown as HTMLCanvasElement;
    return attachInput(fakeCanvas, {
      onTap: (dir, at) => handleTap(dir, at),
      onSwipe: () => { /* item use comes in M2 */ },
    });
  }, [handleTap]);

  return <div ref={ref} className="absolute inset-0 z-20" style={{ touchAction: 'none' }} />;
}
