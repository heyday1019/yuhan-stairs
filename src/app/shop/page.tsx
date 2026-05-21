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

interface PendingBuy {
  itemId: string;
  qty: number;
  name: string;
  totalPrice: number;
}

export default function ShopPage() {
  const router = useRouter();
  const [data, setData] = useState<ShopData | null>(null);
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingBuy | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  const onBuy = (itemId: string, qty: number) => {
    const meta = data?.catalog.find((m) => m.id === itemId);
    if (!meta) return;
    setPending({ itemId, qty, name: meta.name, totalPrice: meta.price * qty });
  };

  const confirmBuy = async () => {
    if (!pending) return;
    const { itemId, qty, name, totalPrice } = pending;
    setPending(null);
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
    setToast(`${name} 구매 완료! -${totalPrice}코인`);
    setTimeout(() => setToast(null), 2000);
  };

  if (!data) return <main className="min-h-dvh bg-slate-950 p-6 text-white">로딩…</main>;

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-slate-950 p-4 text-white">
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

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-slate-800 p-6 text-white">
            <p className="mb-1 text-base font-bold">{pending.name} 구매</p>
            <p className="mb-4 text-sm text-slate-300">{pending.totalPrice}코인을 사용합니다.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPending(null)}
                className="flex-1 rounded-xl bg-slate-700 py-2 text-sm font-bold"
              >
                취소
              </button>
              <button
                onClick={confirmBuy}
                className="flex-1 rounded-xl bg-amber-400 py-2 text-sm font-bold text-amber-900"
              >
                구매
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
