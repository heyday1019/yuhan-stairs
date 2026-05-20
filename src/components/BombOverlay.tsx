'use client';
import { useEffect, useState } from 'react';
import { useGame } from '@/game/store';

export function BombOverlay() {
  const until = useGame((s) => s.bombActiveUntilMs);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!until) return;
    const remaining = until - performance.now();
    if (remaining <= 0) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(t);
  }, [until]);
  if (!visible) return null;
  return <div className="pointer-events-none fixed inset-0 z-50 bg-black/80 transition-opacity" />;
}
