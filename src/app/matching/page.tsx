'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function MatchingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = Number(params.get('mode') ?? '100');

  useEffect(() => {
    // M1: always go to bot match after a short delay.
    const t = setTimeout(async () => {
      const res = await fetch('/api/matches/bot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const { matchId, seed, botDifficulty } = await res.json();
      router.push(`/game/${matchId}?seed=${seed}&mode=${mode}&diff=${botDifficulty}`);
    }, 1500);
    return () => clearTimeout(t);
  }, [mode, router]);

  return (
    <div className="text-center">
      <div className="mb-2 animate-pulse text-2xl font-bold">매칭 중…</div>
      <div className="text-xs opacity-70">1.5초 후 AI 봇과 매치됩니다 (M1)</div>
    </div>
  );
}

export default function MatchingPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 text-white">
      <Suspense
        fallback={
          <div className="text-center">
            <div className="mb-2 animate-pulse text-2xl font-bold">매칭 중…</div>
          </div>
        }
      >
        <MatchingInner />
      </Suspense>
    </main>
  );
}
