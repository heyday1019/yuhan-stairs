'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ITEMS_CATALOG } from '@/shared/items-catalog';

export default function ModeSelectPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem('pending_equipped_slots');
      if (s) setSlots(JSON.parse(s));
    } catch {}
  }, []);

  const onStart = (mode: number) => {
    const q = new URLSearchParams({ mode: String(mode), slots: JSON.stringify(slots) });
    router.push(`/matching?${q}`);
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-white">
      <h2 className="text-xl font-bold">모드 선택</h2>

      <div className="mb-2 w-64">
        <div className="mb-1 text-xs text-slate-400">장착된 아이템</div>
        <div className="flex justify-center gap-2">
          {slots.map((s, i) => (
            <div
              key={i}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-xl"
            >
              {s
                ? ITEMS_CATALOG.find((m) => m.id === s)?.emoji
                : <span className="text-[10px] text-slate-600">슬롯 {i + 1}</span>}
            </div>
          ))}
        </div>
        <Link href="/shop" className="mt-2 block text-center text-xs text-amber-400 underline">
          장착 변경
        </Link>
      </div>

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
