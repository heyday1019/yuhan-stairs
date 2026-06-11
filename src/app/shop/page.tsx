'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/match-network';
import type { BoostId } from '@/shared/shop-catalog';
import { getCharacter } from '@/game/characters';

interface CatalogData {
  coins: number;
  characterId: string;
  activeBoosts: BoostId[];
  boosts: readonly { id: string; label: string; price: number; games: number }[];
  cosmetics: readonly { characterId: string; label: string; price: number }[];
}

export default function ShopPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'boost' | 'cosmetic'>('boost');
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: 'boost' | 'cosmetic'; id: string; label: string; price: number } | null>(null);

  const load = () => {
    apiFetch('/api/shop/catalog').then(r => r.json()).then(setCatalog).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const confirmBuy = async () => {
    if (!modal) return;
    setModal(null);
    const res = await apiFetch('/api/shop/buy', {
      method: 'POST',
      body: JSON.stringify({ type: modal.type, id: modal.id }),
    });
    const json = await res.json();
    if (!res.ok) { showToast(`오류: ${json.error}`); return; }
    showToast('✅ 구매 완료!');
    load();
  };

  return (
    <main className="flex min-h-dvh flex-col bg-slate-950 text-white">
      <header className="flex items-center justify-between p-4">
        <button onClick={() => router.back()} className="text-slate-400">← 뒤로</button>
        <span className="font-bold">상점</span>
        <span className="text-amber-300 text-sm">💰 {catalog?.coins ?? '…'}</span>
      </header>

      {/* 탭 */}
      <div className="flex border-b border-slate-700">
        {(['boost', 'cosmetic'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold ${tab === t ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400'}`}
          >
            {t === 'boost' ? '부스트' : '코스메틱'}
          </button>
        ))}
      </div>

      {/* 부스트 탭 */}
      {tab === 'boost' && (
        <div className="flex flex-col gap-3 p-4">
          {catalog?.boosts.map((b) => {
            const active = catalog.activeBoosts.filter(id => id === b.id).length;
            return (
              <div key={b.id} className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3">
                <div>
                  <div className="font-semibold">{b.label}</div>
                  {active > 0 && <div className="text-xs text-emerald-400">{active * b.games}판 남음</div>}
                </div>
                <button
                  onClick={() => setModal({ type: 'boost', id: b.id, label: b.label, price: b.price })}
                  className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-amber-900"
                >
                  {b.price}코인
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 코스메틱 탭 */}
      {tab === 'cosmetic' && (
        <div className="grid grid-cols-3 gap-3 p-4">
          {catalog?.cosmetics.map((c) => {
            const owned = catalog.characterId === c.characterId;
            const char = getCharacter(c.characterId);
            return (
              <div
                key={c.characterId}
                className={`flex flex-col items-center gap-1 rounded-xl bg-slate-800 p-3 ${owned ? 'ring-2 ring-emerald-400' : ''}`}
              >
                <img src={char.idle} alt={c.label} className="h-12 w-12 object-contain" />
                <span className="text-xs font-semibold">{c.label}</span>
                {owned ? (
                  <span className="text-xs text-emerald-400">✓ 장착 중</span>
                ) : (
                  <button
                    onClick={() => setModal({ type: 'cosmetic', id: c.characterId, label: c.label, price: c.price })}
                    className="rounded-md bg-amber-400 px-2 py-1 text-xs font-bold text-amber-900"
                  >
                    {c.price === 0 ? '무료' : `${c.price}코인`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 구매 확인 모달 */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setModal(null)}>
          <div className="w-full rounded-t-2xl bg-slate-800 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-bold">{modal.label} 구매</h3>
            <p className="mb-6 text-slate-300">{modal.price}코인을 사용합니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 rounded-xl bg-slate-700 py-3 font-semibold">취소</button>
              <button onClick={confirmBuy} className="flex-1 rounded-xl bg-amber-400 py-3 font-bold text-amber-900">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
