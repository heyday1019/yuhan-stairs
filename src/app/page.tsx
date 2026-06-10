'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NicknameModal } from '@/components/NicknameModal';
import { MuteToggle } from '@/components/MuteToggle';
import { LeaderboardMini } from '@/components/LeaderboardMini';
import { apiFetch } from '@/lib/match-network';
import { audio } from '@/lib/audio';

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    apiFetch('/api/users/me')
      .then((r) => r.json())
      .then((j: { coins?: number }) => setCoins(j?.coins ?? 0))
      .catch(() => {});

    audio.hydrateMutedFromStorage();
    audio.loadTracks({
      main_theme: '/audio/main_theme.mp3',
      matching_loop: '/audio/matching_loop.mp3',
      game_loop: '/audio/game_loop.mp3',
      fever_loop: '/audio/fever_loop.mp3',
      result_jingle: '/audio/result_jingle.mp3',
    }).then(() => audio.play('main_theme', { fadeMs: 400 })).catch(() => {});
  }, [ready]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-950 text-white">
      <NicknameModal onReady={() => setReady(true)} />
      {ready && (
        <>
          <header className="absolute right-4 top-4"><MuteToggle /></header>
          <h1 className="text-3xl font-extrabold">유한의 계단 레이스</h1>
          {coins !== null && <div className="text-sm text-amber-300">보유 코인 {coins}</div>}
          <Link
            href="/mode-select"
            className="rounded-2xl bg-amber-400 px-10 py-4 text-lg font-extrabold text-amber-900"
          >
            게임 시작
          </Link>
          <Link
            href="/shop"
            className="rounded-2xl bg-slate-800 px-8 py-3 text-base font-bold text-slate-100"
          >
            상점
          </Link>
          <LeaderboardMini />
          <Link href="/about" className="text-xs text-slate-500 underline">정보</Link>
        </>
      )}
    </main>
  );
}
