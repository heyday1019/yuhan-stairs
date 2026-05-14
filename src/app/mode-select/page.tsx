'use client';
import { useRouter } from 'next/navigation';

export default function ModeSelectPage() {
  const router = useRouter();
  const onStart = (mode: number) => router.push(`/matching?mode=${mode}`);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-white">
      <h2 className="text-xl font-bold">모드 선택</h2>
      {[100, 200, 300, 500, 800].map((m) => (
        <button
          key={m}
          disabled={m !== 100}
          onClick={() => onStart(m)}
          className="w-64 rounded-2xl bg-amber-400 px-6 py-4 text-lg font-extrabold text-amber-900 disabled:bg-slate-700 disabled:text-slate-500"
        >
          {m}층 {m === 100 && '(점심값내기)'} {m !== 100 && '— M2'}
        </button>
      ))}
    </main>
  );
}
