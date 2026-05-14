import { create } from 'zustand';
import type { Stair, FinalResult, BotDifficulty } from '@/shared/types';
import { createComboState, onCorrectTap, onFail, onTimeoutCheck, type ComboState } from '@/shared/combo';
import { FAIL_PENALTY_FLOORS } from '@/shared/constants';

interface GameState {
  matchId: string | null;
  goalFloor: number;
  stairs: Stair[];
  playerFloor: number;
  botFloor: number;
  botDifficulty: BotDifficulty;
  combo: ComboState;
  coinsCollected: number;
  failCount: number;
  inputLockedUntil: number;
  endedReason: FinalResult['endReason'] | null;
  emoji: { from: 'me' | 'opp'; symbol: string; at: number } | null;
  init(args: { matchId: string; goalFloor: number; stairs: Stair[]; botDifficulty: BotDifficulty }): void;
  handleTap(dir: 'L' | 'R', atMs: number): void;
  tickTimers(atMs: number): void;
  setBotFloor(floor: number): void;
  end(reason: FinalResult['endReason']): void;
}

export const useGame = create<GameState>((set, get) => ({
  matchId: null,
  goalFloor: 100,
  stairs: [],
  playerFloor: 0,
  botFloor: 0,
  botDifficulty: 'normal',
  combo: createComboState(),
  coinsCollected: 0,
  failCount: 0,
  inputLockedUntil: 0,
  endedReason: null,
  emoji: null,
  init({ matchId, goalFloor, stairs, botDifficulty }) {
    set({ matchId, goalFloor, stairs, botDifficulty, playerFloor: 0, botFloor: 0, combo: createComboState(), coinsCollected: 0, failCount: 0, inputLockedUntil: 0, endedReason: null });
  },
  handleTap(dir, atMs) {
    const s = get();
    if (s.endedReason || atMs < s.inputLockedUntil) return;
    const next = s.stairs[s.playerFloor];           // next stair to climb (1-based via playerFloor as index)
    if (!next) return;
    if (next.dir === dir) {
      // success
      let coinsCollected = s.coinsCollected + (next.hasCoin ? 1 : 0);
      let playerFloor = s.playerFloor + 1;
      if (next.isBooster) {
        const jump = 2 + Math.floor(Math.random() * 2);  // 2 or 3
        playerFloor = Math.min(s.goalFloor, playerFloor + jump);
        set({ inputLockedUntil: atMs + 400 });
      }
      const combo = onCorrectTap(s.combo, atMs);
      set({ playerFloor, combo, coinsCollected });
      if (playerFloor >= s.goalFloor) get().end('reached_goal');
    } else {
      // fail
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
  setBotFloor(floor) {
    const s = get();
    set({ botFloor: floor });
    if (!s.endedReason && floor >= s.goalFloor) get().end('opponent_reached_goal');
  },
  end(reason) {
    set({ endedReason: reason });
  },
}));
