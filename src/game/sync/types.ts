export type TickEvent =
  | 'fail'
  | 'booster'
  | 'item'
  | 'beanstalk_use'
  | 'mine_hit'
  | 'shield_used';

export interface OpponentState { floor: number; combo?: number; lastEvent?: TickEvent; }
export interface MatchEnded { reason: 'normal' | 'opponent_disconnect' | 'invalidated'; winnerUserId?: string; coins?: Record<string, number>; }

export interface OpponentSyncAdapter {
  start(opts: {
    onOpponentTick: (s: OpponentState) => void;
    onMatchEnded: (e: MatchEnded) => void;
    onCountdown?: (startAtMs: number, seed: string, mode: number) => void;
    onOpponentGrace?: (remainingMs: number) => void;
    onOpponentResumed?: () => void;
    onItemPicked?: (userId: string, itemId: string, floor: number, slotIndex: number) => void;
    onMinePlaced?: (targetUserId: string, floor: number) => void;
    onBombTriggered?: (targetUserId: string, atMs: number, durationMs: number) => void;
    onBeanstalkUsed?: (userId: string, fromFloor: number, toFloor: number) => void;
    onEmojiReceived?: (emoji: string) => void;
  }): void;
  sendTick(tick: { seq?: number; floor: number; combo: number; coins: number; failCount: number; lastEvent?: TickEvent }): void;
  sendFinish(payload: { finalFloor: number; finalScore: number; maxCombo: number; coins: number }): void;
  stop(): void;
}
