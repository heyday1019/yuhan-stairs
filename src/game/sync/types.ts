export type TickEvent = 'fail' | 'booster' | 'beanstalk_use' | 'mine_hit';

export interface OpponentState { floor: number; combo?: number; lastEvent?: TickEvent; }
export interface MatchEnded { reason: 'normal' | 'opponent_disconnect' | 'invalidated'; winnerUserId?: string; coins?: Record<string, number>; }

export interface OpponentSyncAdapter {
  start(opts: {
    onOpponentTick: (s: OpponentState) => void;
    onMatchEnded: (e: MatchEnded) => void;
    onCountdown?: (startAtMs: number, seed: string, mode: number, opponentCharId: string) => void;
    onOpponentGrace?: (remainingMs: number) => void;
    onOpponentResumed?: () => void;
    onMinePlaced?: (targetUserId: string, floor: number) => void;
    onBombTriggered?: (targetUserId: string, atMs: number, durationMs: number) => void;
    onBeanstalkUsed?: (userId: string, fromFloor: number, toFloor: number) => void;
    onLightningTriggered?: (targetUserId: string, durationMs: number) => void;
    onEmojiReceived?: (emoji: string) => void;
  }): void;
  sendTick(tick: { seq?: number; floor: number; combo: number; coins: number; failCount: number; lastEvent?: TickEvent }): void;
  sendFinish(payload: { finalFloor: number; finalScore: number; maxCombo: number; coins: number }): void;
  stop(): void;
}
