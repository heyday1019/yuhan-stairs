'use client';
import { useEffect, useState } from 'react';
import { getOrCreateDeviceId } from '@/lib/device-id';
import { apiFetch } from '@/lib/match-network';
import { CHARACTERS, CHARACTER_STORAGE_KEY, DEFAULT_CHARACTER_ID } from '@/game/characters';

const NICK_KEY = 'stair_race.nickname';

export function NicknameModal({ onReady }: { onReady: () => void }) {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [characterId, setCharacterId] = useState<string>(DEFAULT_CHARACTER_ID);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const nick = localStorage.getItem(NICK_KEY);
    const char = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (nick && char) {
      onReady();
      return;
    }
    if (nick) setNickname(nick);
    if (char) setCharacterId(char);
    setOpen(true);
  }, [onReady]);

  if (!open) return null;

  const submit = async () => {
    setErr(null);
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/users/register', {
        method: 'POST',
        body: JSON.stringify({ deviceId: getOrCreateDeviceId(), nickname }),
      });
      if (!res.ok) {
        setErr((await res.json()).error ?? 'failed');
        return;
      }
      localStorage.setItem(NICK_KEY, nickname.trim());
      localStorage.setItem(CHARACTER_STORAGE_KEY, characterId);
      setOpen(false);
      onReady();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-slate-900">
        <h2 className="mb-3 text-lg font-bold">닉네임 입력</h2>
        <input
          autoFocus
          maxLength={16}
          className="mb-2 w-full rounded border border-slate-300 px-3 py-2"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="1~16자"
        />
        {err && <p className="mb-2 text-xs text-red-600">{err}</p>}

        <h3 className="mb-2 mt-4 text-sm font-bold">캐릭터 선택</h3>
        <div className="grid grid-cols-4 gap-2">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCharacterId(c.id)}
              aria-label={c.label}
              aria-pressed={characterId === c.id}
              className={`relative flex aspect-square items-center justify-center rounded-lg border-2 p-1 transition ${
                characterId === c.id
                  ? 'border-amber-400 bg-amber-50 shadow-sm'
                  : 'border-transparent bg-slate-100 hover:bg-slate-200'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.idle} alt={c.label} className="max-h-full max-w-full object-contain" />
            </button>
          ))}
        </div>

        <button
          disabled={submitting || nickname.trim().length === 0}
          onClick={submit}
          className="mt-4 w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          확인
        </button>
      </div>
    </div>
  );
}
