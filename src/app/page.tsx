import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-950 text-white">
      <h1 className="text-3xl font-extrabold">유한의 계단 레이스</h1>
      <Link
        href="/mode-select"
        className="rounded-2xl bg-amber-400 px-10 py-4 text-lg font-extrabold text-amber-900"
      >
        게임 시작
      </Link>
    </main>
  );
}
