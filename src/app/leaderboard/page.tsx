'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/match-network';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  totalScore: number;
}

interface LeaderboardResp {
  entries: LeaderboardEntry[];
  myEntry: { rank: number; totalScore: number } | null;
}

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function LeaderboardInner() {
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') ?? 'all') as 'all' | 'weekly';
  const router = useRouter();
  const [data, setData] = useState<LeaderboardResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    apiFetch(`/api/leaderboard?tab=${tab}&limit=10`)
      .then((r) => r.json())
      .then((j: LeaderboardResp) => setData(j))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <main className="flex min-h-dvh flex-col bg-slate-950 p-4 pb-24 text-white">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/" className="text-slate-400 hover:text-white">← 홈</Link>
        <h1 className="text-xl font-bold">🏆 랭킹</h1>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex rounded-xl bg-slate-800 p-1">
        {(['all', 'weekly'] as const).map((t) => (
          <button
            key={t}
            onClick={() => router.push(`/leaderboard?tab=${t}`)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              tab === t ? 'bg-amber-400 text-amber-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'all' ? '전체 기간' : '이번 주'}
          </button>
        ))}
      </div>

      {/* Entry list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-800" />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {data?.entries.map((e) => (
            <li
              key={e.userId}
              className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3"
            >
              <span className="w-8 text-center text-lg">
                {RANK_ICONS[e.rank] ?? String(e.rank)}
              </span>
              <span className="flex-1 font-medium">{e.nickname}</span>
              <span className="text-amber-300">{e.totalScore.toLocaleString()}점</span>
            </li>
          ))}
          {data?.entries.length === 0 && (
            <li className="py-8 text-center text-slate-500">아직 랭킹 데이터가 없어요</li>
          )}
        </ul>
      )}

      {/* Sticky my rank — only when outside top 10 */}
      {data?.myEntry && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-700 bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <span className="w-8 text-center font-bold text-amber-400">
              {data.myEntry.rank}위
            </span>
            <span className="flex-1 text-sm text-slate-300">나의 순위</span>
            <span className="text-amber-300">
              {data.myEntry.totalScore.toLocaleString()}점
            </span>
          </div>
        </div>
      )}
    </main>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<main className="flex min-h-dvh items-center justify-center bg-slate-950 text-white"><div className="animate-pulse text-2xl font-bold">로딩 중…</div></main>}>
      <LeaderboardInner />
    </Suspense>
  );
}
