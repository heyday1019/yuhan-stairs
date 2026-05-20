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
  const slotsParam = params.get('slots') ?? '[null,null,null]';
  const [secondsLeft, setSecondsLeft] = useState(FALLBACK_MS / 1000);
  const goneRef = useRef(false);

  const equipBeforeJoin = async (matchId: string) => {
    let itemIds: string[] = [];
    try {
      const parsed = JSON.parse(slotsParam) as (string | null)[];
      itemIds = parsed.filter((s): s is string => typeof s === 'string');
    } catch {}
    if (itemIds.length === 0) return;
    await apiFetch(`/api/matches/${matchId}/items/equip`, {
      method: 'POST',
      body: JSON.stringify({ itemIds }),
    }).catch(() => null);
  };

  const enc = encodeURIComponent(slotsParam);

  useEffect(() => {
    let cancelled = false;
    let channelCleanup: (() => void) | undefined;

    // Start the bot-fallback timer immediately at mount, independent of the
    // network chain below. The previous version only kicked off rAF after
    // /me + subscribe + enqueue resolved, so on a cold-start mobile session
    // the user saw "10초" frozen for several seconds before any visible tick
    // — and if any of those awaits stalled or returned early (e.g. /me 404),
    // rAF never started at all.
    const deadline = performance.now() + FALLBACK_MS;
    let raf = 0;
    const tickTimer = () => {
      if (goneRef.current) return;
      const now = performance.now();
      setSecondsLeft(Math.max(0, Math.ceil((deadline - now) / 1000)));
      if (now >= deadline) { goBot(); return; }
      raf = requestAnimationFrame(tickTimer);
    };
    raf = requestAnimationFrame(tickTimer);

    (async () => {
      const meRes = await apiFetch('/api/users/me');
      if (!meRes.ok) return;
      const me = await meRes.json();
      if (cancelled) return;

      // Subscribe FIRST and wait for the channel to be live so we never miss
      // a match_ready event triggered between enqueue and subscription.
      const channel = subscribePrivateUser(me.id);
      channel.bind('match_ready', (data: { matchId: string }) => {
        if (goneRef.current) return;
        goneRef.current = true;
        equipBeforeJoin(data.matchId).finally(() => {
          router.push(`/game/${data.matchId}?mode=${mode}&type=ranked&slots=${enc}`);
        });
      });
      channelCleanup = () => { channel.unbind_all(); channel.unsubscribe(); };
      await new Promise<void>((resolve) => {
        let done = false;
        const fin = () => { if (!done) { done = true; resolve(); } };
        channel.bind('pusher:subscription_succeeded', fin);
        channel.bind('pusher:subscription_error', fin);
        setTimeout(fin, 3000);
      });
      if (cancelled) return;

      const enqueueRes = await apiFetch('/api/matchmaking/enqueue', { method: 'POST', body: JSON.stringify({ mode }) });
      const enqueue = await enqueueRes.json();
      if (cancelled) return;

      if (enqueue.status === 'paired' || enqueue.status === 'already_in_match') {
        if (!goneRef.current) {
          goneRef.current = true;
          await equipBeforeJoin(enqueue.matchId);
          router.push(`/game/${enqueue.matchId}?mode=${mode}&type=ranked&slots=${enc}`);
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      channelCleanup?.();
    };
  }, [mode, router]);

  const goBot = async () => {
    if (goneRef.current) return;
    goneRef.current = true;
    await apiFetch('/api/matchmaking/cancel', { method: 'POST' });
    const res = await apiFetch('/api/matches/bot', { method: 'POST', body: JSON.stringify({ mode }) });
    const { matchId, seed, botDifficulty } = await res.json();
    router.push(`/game/${matchId}?seed=${seed}&mode=${mode}&diff=${botDifficulty}&type=bot&slots=${enc}`);
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
