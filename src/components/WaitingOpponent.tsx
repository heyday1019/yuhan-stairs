'use client';
export function WaitingOpponent({ remainingMs }: { remainingMs: number }) {
  const sec = Math.ceil(remainingMs / 1000);
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="rounded-lg bg-slate-800 px-5 py-4 text-center text-white">
        <div className="mb-1 text-sm opacity-80">상대 재접속 대기</div>
        <div className="text-2xl font-bold">{sec}초</div>
      </div>
    </div>
  );
}
