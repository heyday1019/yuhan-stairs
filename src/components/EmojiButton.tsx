'use client';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/match-network';

const EMOJIS = ['😂', '😤', '🔥', '👏', '😱'] as const;

interface Props {
  matchId: string;
  onSent?: (emoji: string) => void;
}

export function EmojiButton({ matchId, onSent }: Props) {
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleTap = async () => {
    if (cooldown > 0) return;
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    setCooldown(5);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    onSent?.(emoji);
    try {
      await apiFetch(`/api/matches/${matchId}/emoji`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });
    } catch {}
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <button
      onClick={handleTap}
      disabled={cooldown > 0}
      className={`fixed top-16 right-3 z-40 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition ${
        cooldown > 0
          ? 'cursor-not-allowed bg-slate-700 opacity-50'
          : 'bg-slate-800 hover:bg-slate-700 active:scale-95'
      }`}
    >
      {cooldown > 0 ? (
        <span className="text-xs font-bold text-white">{cooldown}s</span>
      ) : (
        <span className="text-xl">😊</span>
      )}
    </button>
  );
}
