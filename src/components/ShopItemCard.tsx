'use client';
import type { ItemMeta } from '@/shared/items-catalog';

export function ShopItemCard({
  meta, owned, coins, onBuy,
}: { meta: ItemMeta; owned: number; coins: number; onBuy: (qty: number) => void }) {
  const canAfford = coins >= meta.price;
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-slate-800 p-4">
      <div className="text-4xl">{meta.emoji}</div>
      <div className="flex-1">
        <div className="text-base font-bold text-white">{meta.name}</div>
        <div className="text-xs text-slate-400">{meta.desc}</div>
        <div className="mt-1 text-sm text-amber-300">{meta.price} 코인 · 보유 {owned}</div>
      </div>
      <button
        disabled={!canAfford}
        onClick={() => onBuy(1)}
        className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-amber-900 disabled:bg-slate-700 disabled:text-slate-500"
      >
        구매
      </button>
    </div>
  );
}
