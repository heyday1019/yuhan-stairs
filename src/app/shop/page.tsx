'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShopItemCard } from '@/components/ShopItemCard';
import { SlotPicker } from '@/components/SlotPicker';
import { apiFetch } from '@/lib/match-network';
import type { ItemMeta } from '@/shared/items-catalog';

interface ShopData {
  catalog: ItemMeta[];
  inventory: Record<string, number>;
  coins: number;
}

export default function ShopPage() {
  const router = useRouter();
  const [data, setData] = useState<ShopData | null>(null);
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [error, setError] = useState<string | null>(null);

  const reload = () =>
    apiFetch('/api/shop/items')
      .then((r) => r.json())
      .then((d: ShopData) => { setData(d); setError(null); })
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    reload();
    try {
      const saved = sessionStorage.getItem('pending_equipped_slots');
      if (saved) setSlots(JSON.parse(saved));
    } catch {}
  }, []);

  const onBuy = async (itemId: string, qty: number) => {
    const res = await apiFetch('/api/shop/buy', {
      method: 'POST',
      body: JSON.stringify({ itemId, qty }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? '구매 실패');
      return;
    }
    await reload();
  };

  if (!data) return <main className="p-6 text-white">로딩…</main>;

  return (
    <main className="mx-auto max-w-md p-4 text-white">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">상점</h1>
        <div className="text-sm">보유 코인 {data.coins}</div>
      </header>

      {error && <div className="mb-3 rounded bg-rose-900 px-3 py-2 text-xs">{error}</div>}

      <section className="mb-6">
        <h2 className="mb-2 text-sm text-slate-400">아이템 구매</h2>
        <div className="flex flex-col gap-2">
          {data.catalog.map((meta) => (
            <ShopItemCard
              key={meta.id}
              meta={meta}
              owned={data.inventory[meta.id] ?? 0}
              coins={data.coins}
              onBuy={(q) => onBuy(meta.id, q)}
            />
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm text-slate-400">다음 매치 슬롯</h2>
        <SlotPicker
          inventory={data.inventory}
          initialSlots={slots}
          onChange={(s) => {
            setSlots(s);
            try { sessionStorage.setItem('pending_equipped_slots', JSON.stringify(s)); } catch {}
          }}
        />
      </section>

      <button
        onClick={() => router.push('/mode-select')}
        className="w-full rounded-2xl bg-amber-400 px-6 py-4 text-lg font-extrabold text-amber-900"
      >
        모드 선택으로
      </button>
    </main>
  );
}
