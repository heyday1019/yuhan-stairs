'use client';
import { useGame } from '@/game/store';

export function Hud() {
  const { playerFloor, goalFloor, botFloor, combo, coinsCollected } = useGame();
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-slate-900/80 px-4 py-3 text-white">
      <div className="text-xs opacity-80">상대 {botFloor}F</div>
      <div className="text-center">
        <div className="text-2xl font-extrabold text-amber-300">{playerFloor}</div>
        <div className="text-[10px] opacity-70">/ {goalFloor}층</div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span>콤보 {combo.combo}</span>
        <span className="text-amber-300">₩ {coinsCollected}</span>
      </div>
    </div>
  );
}
