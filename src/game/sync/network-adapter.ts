'use client';
import type { OpponentSyncAdapter, OpponentState, MatchEnded } from './types';
import { subscribePresenceMatch } from '@/lib/pusher-client';
import { apiFetch, createTickSender } from '@/lib/match-network';
import type { Channel } from 'pusher-js';

export function createNetworkAdapter(matchId: string): OpponentSyncAdapter {
  let channel: Channel | null = null;
  const sendTickInner = createTickSender(matchId);
  let tickTimer: ReturnType<typeof setInterval> | null = null;
  let lastPayload: Parameters<typeof sendTickInner>[0] | null = null;

  return {
    start(opts) {
      channel = subscribePresenceMatch(matchId);
      channel.bind('match_start', (data: { startAtMs: number; seed: string; mode: number }) => {
        opts.onCountdown?.(data.startAtMs, data.seed, data.mode);
      });
      channel.bind('opponent_tick', (data: OpponentState & { userId: string }) => {
        opts.onOpponentTick({ floor: data.floor, combo: data.combo, lastEvent: data.lastEvent });
      });
      channel.bind('opponent_disconnected_grace', (data: { remainingMs: number }) => {
        opts.onOpponentGrace?.(data.remainingMs);
      });
      channel.bind('opponent_resumed', () => { opts.onOpponentResumed?.(); });
      channel.bind('match_ended', (data: MatchEnded) => { opts.onMatchEnded(data); });
      channel.bind('item_picked', (data: { userId: string; itemId: string; floor: number; slotIndex: number }) => {
        opts.onItemPicked?.(data.itemId, data.floor, data.slotIndex);
      });
      channel.bind('mine_placed', (data: { targetUserId: string; floor: number }) => {
        opts.onMinePlaced?.(data.targetUserId, data.floor);
      });
      channel.bind('bomb_triggered', (data: { targetUserId: string; atMs: number; durationMs: number }) => {
        opts.onBombTriggered?.(data.atMs, data.durationMs);
      });
      channel.bind('beanstalk_used', (data: { userId: string; fromFloor: number; toFloor: number }) => {
        opts.onBeanstalkUsed?.(data.userId, data.fromFloor, data.toFloor);
      });

      tickTimer = setInterval(() => {
        if (lastPayload) sendTickInner(lastPayload);
      }, 200);
    },
    sendTick(payload) {
      lastPayload = payload;
      if (payload.lastEvent) sendTickInner(payload);
    },
    async sendFinish(payload) {
      await apiFetch(`/api/matches/${matchId}/finish`, { method: 'POST', body: JSON.stringify(payload) });
    },
    stop() {
      if (tickTimer) clearInterval(tickTimer);
      if (channel) { channel.unbind_all(); channel.unsubscribe(); }
    },
  };
}
