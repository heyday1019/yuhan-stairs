'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/match-network';

interface Entry {
  rank: number;
  nickname: string;
  totalScore: number;
}

const ICONS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export function LeaderboardMini() {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    apiFetch('/api/leaderboard?limit=3')
      .then((r) => r.json())
      .then((j: { entries: Entry[] }) => setEntries(j.entries))
      .catch(() => setEntries([]));
  }, []);

  return (
    <div className="w-full max-w-xs rounded-2xl bg-slate-800 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-200">🏆 랭킹 TOP 3</h2>
        <Link href="/leaderboard" className="text-xs text-amber-400 hover:underline">
          전체 보기 →
        </Link>
      </div>
      {entries === null ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 animate-pulse rounded bg-slate-700" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-slate-500">아직 랭킹 데이터가 없어요</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((e) => (
            <li key={e.nickname} className="flex items-center gap-2 text-sm">
              <span className="w-5 text-center">{ICONS[e.rank] ?? String(e.rank)}</span>
              <span className="flex-1 text-slate-200">{e.nickname}</span>
              <span className="text-xs text-amber-300">
                {e.totalScore.toLocaleString()}점
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
