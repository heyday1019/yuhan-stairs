'use client';
import { useGame } from '@/game/store';

export function ParallaxLayers() {
  const combo = useGame((s) => s.combo.combo);
  const speed = combo >= 50 ? 1.6 : combo >= 20 ? 1.4 : combo >= 10 ? 1.25 : combo >= 5 ? 1.1 : 1.0;
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="parallax-slow absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-950 to-black"
        style={{ animationDuration: `${20 / speed}s` }}
      />
      <div
        className="parallax-fast absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(2px 2px at 20% 10%, white, transparent), radial-gradient(2px 2px at 60% 30%, white, transparent), radial-gradient(2px 2px at 80% 70%, white, transparent)',
          animationDuration: `${10 / speed}s`,
        }}
      />
    </div>
  );
}
