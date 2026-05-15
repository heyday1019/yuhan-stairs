import { create } from 'zustand';
import type { Stair, FinalResult, BotDifficulty } from '@/shared/types';
import type { MatchEnded } from './sync/types';
import { createComboState, onCorrectTap, onFail, onTimeoutCheck, type ComboState } from '@/shared/combo';
import { FAIL_PENALTY_FLOORS } from '@/shared/constants';

interface GameState {
  matchId: string | null;
  goalFloor: number;
  stairs: Stair[];
  playerFloor: number;
  opponentFloor: number;
  botDifficulty: BotDifficulty;
  combo: ComboState;
  coinsCollected: number;
  failCount: number;
  inputLockedUntil: number;
  endedReason: FinalResult['endReason'] | null;
  matchStartAtMs: number | null;
  opponentDisconnectedGraceMs: number | null;
  emoji: { from: 'me' | 'opp'; symbol: string; at: number } | null;
  init(args: { matchId: string; goalFloor: number; stairs: Stair[]; botDifficulty: BotDifficulty }): void;
  handleTap(dir: 'L' | 'R', atMs: number): void;
  tickTimers(atMs: number): void;
  setOpponentFloor(floor: number): void;
  setBotFloor(floor: number): void; // legacy alias for compatibility — internal calls setOpponentFloor
  setMatchStartAt(startAtMs: number | null): void;
  setOpponentDisconnectedGrace(remainingMs: number | null): void;
  setOpponentResumed(): void;
  applyMatchEnded(payload: MatchEnded): void;
  end(reason: FinalResult['endReason']): void;
}

export const useGame = create<GameState>((set, get) => ({
  matchId: null,
  goalFloor: 100,
  stairs: [],
  playerFloor: 0,
  opponentFloor: 0,
  botDifficulty: 'normal',
  combo: createComboState(),
  coinsCollected: 0,
  failCount: 0,
  inputLockedUntil: 0,
  endedReason: null,
  matchStartAtMs: null,
  opponentDisconnectedGraceMs: null,
  emoji: null,
  init({ matchId, goalFloor, stairs, botDifficulty }) {
    set({ matchId, goalFloor, stairs, botDifficulty, playerFloor: 0, opponentFloor: 0, combo: createComboState(), coinsCollected: 0, failCount: 0, inputLockedUntil: 0, endedReason: null, matchStartAtMs: null, opponentDisconnectedGraceMs: null });
  },
  handleTap(dir, atMs) {
    const s = get();
    if (s.endedReason || atMs < s.inputLockedUntil) return;
    if (s.matchStartAtMs !== null && atMs < s.matchStartAtMs) return;
    const next = s.stairs[s.playerFloor];
    if (!next) return;
    if (next.dir === dir) {
      let coinsCollected = s.coinsCollected + (next.hasCoin ? 1 : 0);
      if (next.isBooster) coinsCollected += 3;
      const playerFloor = s.playerFloor + 1;
      const combo = onCorrectTap(s.combo, atMs);
      if (combo.combo > 0 && combo.combo % 5 === 0) coinsCollected += 1;
      set({ playerFloor, combo, coinsCollected });
      if (playerFloor >= s.goalFloor) get().end('reached_goal');
    } else {
      const combo = onFail(s.combo);
      const playerFloor = Math.max(0, s.playerFloor - FAIL_PENALTY_FLOORS);
      set({ playerFloor, combo, failCount: s.failCount + 1, inputLockedUntil: atMs + 400 });
    }
  },
  tickTimers(atMs) {
    const s = get();
    const combo = onTimeoutCheck(s.combo, atMs);
    if (combo !== s.combo) set({ combo });
  },
  setOpponentFloor(floor) {
    const s = get();
    set({ opponentFloor: floor });
    if (!s.endedReason && floor >= s.goalFloor) get().end('opponent_reached_goal');
  },
  setBotFloor(floor) { get().setOpponentFloor(floor); },
  setMatchStartAt(startAtMs) { set({ matchStartAtMs: startAtMs }); },
  setOpponentDisconnectedGrace(remainingMs) { set({ opponentDisconnectedGraceMs: remainingMs }); },
  setOpponentResumed() { set({ opponentDisconnectedGraceMs: null }); },
  applyMatchEnded(payload) {
    const reason: FinalResult['endReason'] = payload.reason === 'normal'
      ? (payload.winnerUserId ? 'opponent_reached_goal' : 'reached_goal')
      : payload.reason === 'opponent_disconnect' ? 'opponent_disconnect'
      : 'invalidated';
    set({ endedReason: reason });
  },
  end(reason) { set({ endedReason: reason }); },
}));
