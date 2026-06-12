'use client';
import { useRouter } from 'next/navigation';

export default function ModeSelectPage() {
  const router = useRouter();

  const onStart = (mode: number) => {
    router.push(`/matching?mode=${mode}`);
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-white">
      <h2 className="text-xl font-bold">모드 선택</h2>

      {([
        [100, '점심값내기'],
        [200, '선물사주기'],
        [300, '해외여행'],
        [500, '차사주기'],
        [800, '집사주기'],
      ] as [number, string][]).map(([m, label]) => (
        <button
          key={m}
          onClick={() => onStart(m)}
          className="w-64 rounded-2xl bg-amber-400 px-6 py-4 text-lg font-extrabold text-amber-900"
        >
          {m}층 ({label})
        </button>
      ))}
    </main>
  );
}
