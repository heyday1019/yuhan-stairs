'use client';
import { useState } from 'react';
import { ITEMS_CATALOG } from '@/shared/items-catalog';

interface Props {
  inventory: Record<string, number>;
  initialSlots?: (string | null)[];
  onChange: (slots: (string | null)[]) => void;
}

export function SlotPicker({ inventory, initialSlots = [null, null, null], onChange }: Props) {
  const [slots, setSlots] = useState<(string | null)[]>(initialSlots);
  const update = (next: (string | null)[]) => { setSlots(next); onChange(next); };
  const equip = (idx: number, itemId: string) => {
    const next = slots.slice();
    next[idx] = itemId;
    update(next);
  };
  const clear = (idx: number) => {
    const next = slots.slice();
    next[idx] = null;
    update(next);
  };

  const used: Record<string, number> = {};
  for (const s of slots) if (s) used[s] = (used[s] ?? 0) + 1;
  const remaining: Record<string, number> = {};
  for (const meta of ITEMS_CATALOG) remaining[meta.id] = (inventory[meta.id] ?? 0) - (used[meta.id] ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center gap-2">
        {slots.map((s, i) => (
          <button
            key={i}
            onClick={() => s && clear(i)}
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-700 text-3xl"
          >
            {s ? ITEMS_CATALOG.find((m) => m.id === s)?.emoji : <span className="text-sm text-slate-500">슬롯 {i + 1}</span>}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ITEMS_CATALOG.map((meta) => (
          <button
            key={meta.id}
            disabled={remaining[meta.id] <= 0}
            onClick={() => {
              const free = slots.findIndex((x) => x === null);
              if (free >= 0) equip(free, meta.id);
            }}
            className="rounded-xl bg-slate-800 p-2 text-xs text-white disabled:bg-slate-900 disabled:text-slate-600"
          >
            {meta.emoji} {meta.name}
            <div className="text-[10px] text-slate-400">남은 {remaining[meta.id]}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
