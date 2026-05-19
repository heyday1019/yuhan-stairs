'use client';
import { getOrCreateDeviceId } from './device-id';
import type { TickEvent } from '@/game/sync/types';

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('x-device-id', getOrCreateDeviceId());
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  return fetch(path, { ...init, headers });
}

export function createTickSender(matchId: string) {
  let inFlight = false;
  let nextSeq = 1;
  return async (payload: { floor: number; combo: number; coins: number; failCount: number; lastEvent?: TickEvent }) => {
    if (inFlight) return;
    inFlight = true;
    try {
      const seq = nextSeq++;
      await apiFetch(`/api/matches/${matchId}/tick`, { method: 'POST', body: JSON.stringify({ ...payload, seq, clientNowMs: Date.now() }) });
    } finally { inFlight = false; }
  };
}
