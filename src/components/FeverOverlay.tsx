'use client';
import { useGame } from '@/game/store';

export function FeverOverlay() {
  const combo = useGame((s) => s.combo.combo);
  if (combo < 50) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <div
        className="fever-pulse absolute inset-0"
        style={{ boxShadow: 'inset 0 0 80px 20px rgba(255, 80, 200, 0.5)' }}
      />
    </div>
  );
}
