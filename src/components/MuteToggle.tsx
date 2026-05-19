'use client';
import { useEffect, useState } from 'react';
import { audio } from '@/lib/audio';

export function MuteToggle() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    audio.hydrateMutedFromStorage();
    setMuted(audio.isMuted);
  }, []);

  const toggle = () => {
    const next = !muted;
    audio.setMuted(next);
    setMuted(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? '소리 켜기' : '소리 끄기'}
      className="rounded-full bg-slate-800 px-3 py-2 text-sm text-slate-200"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
