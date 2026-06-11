'use client';
import { useEffect, useRef, useState } from 'react';

const ITEMS = [
  { id: 'beanstalk', emoji: '🌱', label: '덩굴콩' },
  { id: 'bomb',      emoji: '💣', label: '폭탄' },
  { id: 'mine',      emoji: '💀', label: '지뢰' },
  { id: 'lightning', emoji: '⚡', label: '번개' },
] as const;

interface Props {
  result: string;          // 확정된 아이템 id
  onDone: () => void;      // 애니메이션 완료 콜백
}

export function RouletteOverlay({ result, onDone }: Props) {
  const [displayIdx, setDisplayIdx] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(performance.now());
  const DURATION_MS = 700;

  useEffect(() => {
    startRef.current = performance.now();
    let idx = 0;
    intervalRef.current = setInterval(() => {
      const elapsed = performance.now() - startRef.current;
      const t = Math.min(elapsed / DURATION_MS, 1);
      // ease-out: 초기 빠름 → 감속
      const interval = 60 + t * 200;
      idx = (idx + 1) % ITEMS.length;
      setDisplayIdx(idx);
      if (elapsed >= DURATION_MS) {
        // 결과 아이템으로 고정
        const resultIdx = ITEMS.findIndex((i) => i.id === result);
        setDisplayIdx(resultIdx >= 0 ? resultIdx : 0);
        setDone(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(onDone, 350);
      }
    }, 80);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [result, onDone]);

  const current = ITEMS[displayIdx];

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={`flex flex-col items-center gap-2 rounded-2xl bg-slate-800 px-10 py-8 shadow-2xl transition-transform ${done ? 'scale-110' : 'scale-100'}`}
      >
        <div className={`text-7xl transition-transform duration-100 ${done ? 'scale-125' : ''}`}>
          {current.emoji}
        </div>
        <div className="text-lg font-bold text-white">{current.label}</div>
        {done && <div className="text-xs text-amber-300">발동!</div>}
      </div>
    </div>
  );
}
