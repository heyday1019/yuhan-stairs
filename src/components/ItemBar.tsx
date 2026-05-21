'use client';
import { useEffect, useState } from 'react';
import { useGame } from '@/game/store';
import { ITEMS_CATALOG } from '@/shared/items-catalog';

const TUTORIAL_KEY = 'item_tutorial_seen';

export function ItemBar() {
  const slots = useGame((s) => s.equippedSlots);
  const useSlot = useGame((s) => s.useSlot);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TUTORIAL_KEY)) setShowTutorial(true);
    } catch {}
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch {}
    setShowTutorial(false);
  };

  return (
    <>
      <div className="pointer-events-auto fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
        {slots.map((s, i) => {
          const meta = s ? ITEMS_CATALOG.find((m) => m.id === s) : null;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <button
                disabled={!s}
                onClick={() => useSlot(i)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/90 text-2xl shadow-lg disabled:opacity-30"
              >
                {meta?.emoji ?? ''}
              </button>
              {meta && (
                <span className="text-[10px] font-medium leading-tight text-white/90 drop-shadow">
                  {meta.name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-slate-800 p-6 text-center text-white shadow-xl">
            <div className="mb-2 text-3xl">🌱 💥 💣</div>
            <h3 className="mb-2 text-lg font-bold">아이템 사용법</h3>
            <p className="mb-4 text-sm text-slate-300">
              계단을 오르며 아이템을 줍거나 상점에서 산 아이템은 화면 가운데 아래 슬롯에 표시됩니다.
              <br />
              슬롯을 <b className="text-amber-300">탭</b>하면 사용돼요.
            </p>
            <button
              onClick={dismiss}
              className="w-full rounded-xl bg-amber-400 py-2 text-sm font-bold text-amber-900"
            >
              알겠어요
            </button>
          </div>
        </div>
      )}
    </>
  );
}
