'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGame } from '@/game/store';
import { apiFetch } from '@/lib/match-network';
import { audio } from '@/lib/audio';
import { getItemMeta, isValidItemId } from '@/shared/items-catalog';

interface ItemUsedEntry {
  userId: string;
  itemId: string;
  atMs: number;
}

interface EndResp {
  score: number;
  won: boolean;
  rewardCoins: number;
  pickupCoins: number;
  totalDelta: number;
  itemsUsed?: ItemUsedEntry[];
}

export default function ResultPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const game = useGame();
  const [resp, setResp] = useState<EndResp | null>(null);
  const [endError, setEndError] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/users/me')
      .then((r) => r.json())
      .then((j: { id?: string }) => setMyUserId(j?.id ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    audio.play('result_jingle', { loop: false });
  }, []);

  useEffect(() => {
    if (!game.matchId || !game.endedReason) return;
    apiFetch(`/api/matches/${params.matchId}/end`, {
      method: 'POST',
      body: JSON.stringify({
        finalFloor: game.playerFloor,
        maxFloorReached: game.maxFloorReached,
        maxCombo: game.combo.maxCombo,
        totalCoins: game.coinsCollected,
        failCount: game.failCount,
        endReason: game.endedReason,
      }),
    })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
          setEndError(typeof body?.error === 'string' ? body.error : `HTTP ${r.status}`);
          return;
        }
        setResp(body);
      })
      .catch((e) => setEndError(String(e?.message ?? e)));
  }, [game.matchId, game.endedReason, params.matchId]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-white">
      <h2 className="text-2xl font-bold">
        {resp == null ? '집계 중...' : resp.won ? '승리!' : '패배'}
      </h2>
      <div className="text-center">
        <div className="text-sm opacity-80">내 최종 층 {game.playerFloor} / {game.goalFloor}</div>
        <div className="text-sm opacity-80">상대 최종 층 {game.opponentFloor} / {game.goalFloor}</div>
        <div className="text-sm opacity-80">점수 {resp?.score ?? '...'}</div>
        <div className="mt-4 text-amber-300">획득 코인 {resp == null ? '...' : `+${resp.totalDelta}`}</div>
      </div>

      {resp?.itemsUsed && resp.itemsUsed.length > 0 && (
        <section className="mt-2 w-full max-w-xs">
          <h3 className="mb-1 text-sm text-slate-400">사용 아이템</h3>
          <ul className="space-y-1 text-xs text-slate-300">
            {resp.itemsUsed.map((u, i) => {
              const meta = isValidItemId(u.itemId) ? getItemMeta(u.itemId) : null;
              const who = u.userId === myUserId ? '나' : '상대';
              return (
                <li key={i} className="rounded bg-slate-900 px-2 py-1">
                  {who} → {meta ? `${meta.emoji} ${meta.name}` : u.itemId}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <button
        onClick={() => router.push('/')}
        className="mt-6 rounded-xl bg-amber-400 px-6 py-3 font-bold text-amber-900"
      >
        홈으로
      </button>
    </main>
  );
}
