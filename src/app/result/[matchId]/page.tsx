'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGame } from '@/game/store';
import { apiFetch } from '@/lib/match-network';

interface EndResp { score: number; won: boolean; rewardCoins: number; pickupCoins: number; totalDelta: number; }

export default function ResultPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const game = useGame();
  const [resp, setResp] = useState<EndResp | null>(null);

  useEffect(() => {
    if (!game.matchId || !game.endedReason) return;
    apiFetch(`/api/matches/${params.matchId}/end`, {
      method: 'POST',
      body: JSON.stringify({
        finalFloor: game.playerFloor,
        maxCombo: game.combo.maxCombo,
        totalCoins: game.coinsCollected,
        failCount: game.failCount,
        endReason: game.endedReason,
      }),
    }).then((r) => r.json()).then(setResp);
  }, [game.matchId, game.endedReason, params.matchId]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-white">
      <h2 className="text-2xl font-bold">{resp?.won ? '승리!' : '패배'}</h2>
      <div className="text-center">
        <div className="text-sm opacity-80">최종 층 {game.playerFloor} / {game.goalFloor}</div>
        <div className="text-sm opacity-80">점수 {resp?.score ?? '...'}</div>
        <div className="mt-4 text-amber-300">획득 코인 +{resp?.totalDelta ?? 0}</div>
      </div>
      <button
        onClick={() => router.push('/')}
        className="mt-6 rounded-xl bg-amber-400 px-6 py-3 font-bold text-amber-900"
      >
        홈으로
      </button>
    </main>
  );
}
