'use client';
import { useGame } from '@/game/store';
import { ITEMS_CATALOG } from '@/shared/items-catalog';

export function ItemBar() {
  const slots = useGame((s) => s.equippedSlots);
  const useSlot = useGame((s) => s.useSlot);
  return (
    <div className="pointer-events-auto fixed bottom-4 left-4 flex gap-2">
      {slots.map((s, i) => (
        <button
          key={i}
          disabled={!s}
          onClick={() => useSlot(i)}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/90 text-2xl shadow-lg disabled:opacity-30"
        >
          {s ? ITEMS_CATALOG.find((m) => m.id === s)?.emoji : ''}
        </button>
      ))}
    </div>
  );
}
