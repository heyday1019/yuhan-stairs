export interface OpponentState { floor: number; combo?: number; lastEvent?: 'fail'|'booster'|'item'; }
export interface MatchEnded { reason: 'normal' | 'opponent_disconnect' | 'invalidated'; winnerUserId?: string; coins?: Record<string, number>; }

export interface OpponentSyncAdapter {
  start(opts: {
    onOpponentTick: (s: OpponentState) => void;
    onMatchEnded: (e: MatchEnded) => void;
    onCountdown?: (startAtMs: number, seed: string, mode: number) => void;
    onOpponentGrace?: (remainingMs: number) => void;
    onOpponentResumed?: () => void;
  }): void;
  sendTick(tick: { seq?: number; floor: number; combo: number; coins: number; failCount: number; lastEvent?: 'fail'|'booster'|'item' }): void;
  sendFinish(payload: { finalFloor: number; finalScore: number; maxCombo: number; coins: number }): void;
  stop(): void;
}
