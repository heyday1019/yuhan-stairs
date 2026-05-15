'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/match-network';
import { subscribePrivateUser } from '@/lib/pusher-client';

const FALLBACK_MS = 10_000;

function MatchingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = Number(params.get('mode') ?? '100');
  const [secondsLeft, setSecondsLeft] = useState(FALLBACK_MS / 1000);
  const goneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    (async () => {
      const meRes = await apiFetch('/api/users/me');
      if (!meRes.ok) return;
      const me = await meRes.json();
      if (cancelled) return;

      const enqueueRes = await apiFetch('/api/matchmaking/enqueue', { method: 'POST', body: JSON.stringify({ mode }) });
      const enqueue = await enqueueRes.json();
      if (cancelled) return;

      if (enqueue.status === 'paired' || enqueue.status === 'already_in_match') {
        goneRef.current = true;
        router.push(`/game/${enqueue.matchId}?mode=${mode}&type=ranked`);
        return;
      }

      const channel = subscribePrivateUser(me.id);
      channel.bind('match_ready', (data: { matchId: string }) => {
        if (goneRef.current) return;
        goneRef.current = true;
        router.push(`/game/${data.matchId}?mode=${mode}&type=ranked`);
      });
      const tick = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
      const fallback = setTimeout(() => { if (!goneRef.current) goBot(); }, FALLBACK_MS);
      cleanup = () => { clearInterval(tick); clearTimeout(fallback); channel.unbind_all(); channel.unsubscribe(); };
    })();
    return () => { cancelled = true; cleanup?.(); };
  }, [mode, router]);

  const goBot = async () => {
    if (goneRef.current) return;
    goneRef.current = true;
    await apiFetch('/api/matchmaking/cancel', { method: 'POST' });
    const res = await apiFetch('/api/matches/bot', { method: 'POST', body: JSON.stringify({ mode }) });
    const { matchId, seed, botDifficulty } = await res.json();
    router.push(`/game/${matchId}?seed=${seed}&mode=${mode}&diff=${botDifficulty}&type=bot`);
  };

  return (
    <div className="text-center">
      <div className="mb-2 animate-pulse text-2xl font-bold">매칭 중…</div>
      <div className="text-xs opacity-70">{secondsLeft}초 후 자동으로 봇과 매치됩니다</div>
      <button onClick={goBot} className="mt-6 rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900">봇과 지금 시작</button>
    </div>
  );
}

export default function MatchingPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 text-white">
      <Suspense fallback={<div className="animate-pulse text-2xl font-bold">매칭 중…</div>}>
        <MatchingInner />
      </Suspense>
    </main>
  );
}
