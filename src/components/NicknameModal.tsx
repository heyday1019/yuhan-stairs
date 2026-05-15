'use client';
import { useEffect, useState } from 'react';
import { getOrCreateDeviceId } from '@/lib/device-id';
import { apiFetch } from '@/lib/match-network';

const NICK_KEY = 'stair_race.nickname';

export function NicknameModal({ onReady }: { onReady: () => void }) {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(NICK_KEY);
    if (stored) onReady(); else setOpen(true);
  }, [onReady]);

  if (!open) return null;

  const submit = async () => {
    setErr(null); setSubmitting(true);
    try {
      const res = await apiFetch('/api/users/register', { method: 'POST', body: JSON.stringify({ deviceId: getOrCreateDeviceId(), nickname }) });
      if (!res.ok) { setErr((await res.json()).error ?? 'failed'); return; }
      localStorage.setItem(NICK_KEY, nickname.trim());
      setOpen(false);
      onReady();
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-72 rounded-lg bg-white p-5 text-slate-900">
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
        <button
          disabled={submitting || nickname.trim().length === 0}
          onClick={submit}
          className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >확인</button>
      </div>
    </div>
  );
}
