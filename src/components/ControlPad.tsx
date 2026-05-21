'use client';
import type { PointerEvent } from 'react';
import { useGame } from '@/game/store';

export function ControlPad() {
  const handleTap = useGame((s) => s.handleTap);

  const tap = (dir: 'L' | 'R') => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleTap(dir, performance.now());
  };

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end gap-2 px-4 pb-6 pt-3"
      style={{ touchAction: 'manipulation' }}
    >
      <button
        type="button"
        aria-label="왼쪽 계단"
        onPointerDown={tap('L')}
        className="pointer-events-auto flex-1 select-none rounded-2xl border border-amber-400/40 bg-slate-800/80 py-6 text-3xl font-bold text-amber-200 backdrop-blur transition active:scale-95 active:bg-amber-500/30"
      >
        ◀
      </button>
      <div className="w-20 shrink-0" aria-hidden />
      <button
        type="button"
        aria-label="오른쪽 계단"
        onPointerDown={tap('R')}
        className="pointer-events-auto flex-1 select-none rounded-2xl border border-amber-400/40 bg-slate-800/80 py-6 text-3xl font-bold text-amber-200 backdrop-blur transition active:scale-95 active:bg-amber-500/30"
      >
        ▶
      </button>
    </div>
  );
}
