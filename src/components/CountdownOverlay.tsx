'use client';
import { useEffect, useState } from 'react';

export function CountdownOverlay({ startAtMs, onDone }: { startAtMs: number; onDone: () => void }) {
  const [n, setN] = useState<number | 'GO' | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const remaining = startAtMs - performance.now();
      if (remaining <= -200) { onDone(); return; }
      if (remaining <= 0) setN('GO');
      else if (remaining <= 1000) setN(1);
      else if (remaining <= 2000) setN(2);
      else if (remaining <= 3000) setN(3);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startAtMs, onDone]);

  if (n === null) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <div className="text-7xl font-extrabold text-white drop-shadow-lg">{n}</div>
    </div>
  );
}
