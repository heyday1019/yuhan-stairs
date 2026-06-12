'use client';
import { useEffect, useRef, useState } from 'react';

const ITEMS = [
  { id: 'beanstalk', emoji: '🌱', label: '덩굴콩' },
  { id: 'bomb',      emoji: '💣', label: '폭탄' },
  { id: 'mine',      emoji: '💀', label: '지뢰' },
  { id: 'lightning', emoji: '⚡', label: '번개' },
] as const;

interface Props {
  result: string;
  onDone: () => void;
}

export function RouletteOverlay({ result, onDone }: Props) {
  const [displayIdx, setDisplayIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(performance.now());
  const DURATION_MS = 700;

  // slide-in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    startRef.current = performance.now();
    let idx = 0;
    intervalRef.current = setInterval(() => {
      const elapsed = performance.now() - startRef.current;
      idx = (idx + 1) % ITEMS.length;
      setDisplayIdx(idx);
      if (elapsed >= DURATION_MS) {
        const resultIdx = ITEMS.findIndex((i) => i.id === result);
        setDisplayIdx(resultIdx >= 0 ? resultIdx : 0);
        setDone(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        // slide out then fire onDone
        setTimeout(() => setVisible(false), 600);
        setTimeout(onDone, 950);
      }
    }, 80);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [result, onDone]);

  const current = ITEMS[displayIdx];

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-20 transition-transform duration-300 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}
      style={{ top: '70px' }}
    >
      <div className="flex items-center gap-3 border-b-2 border-blue-400/50 bg-slate-900/90 px-4 py-2 backdrop-blur-sm">
        {/* cycling emoji row */}
        <div className="flex items-center gap-2">
          {ITEMS.map((item, i) => (
            <span
              key={item.id}
              className={`transition-all duration-75 ${i === displayIdx ? 'text-2xl opacity-100' : 'text-sm opacity-30'}`}
            >
              {item.emoji}
            </span>
          ))}
        </div>
        {/* divider */}
        <div className="h-5 w-px bg-slate-600" />
        {/* label */}
        <div className="text-xs font-bold">
          {done ? (
            <span className="text-amber-300">✨ {current.label} 발동!</span>
          ) : (
            <span className="text-slate-400">아이템 획득 중...</span>
          )}
        </div>
      </div>
    </div>
  );
}
