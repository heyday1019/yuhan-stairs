import { create } from 'zustand';
import type { Stair, FinalResult, BotDifficulty } from '@/shared/types';
import type { MatchEnded } from './sync/types';
import { createComboState, onCorrectTap, onFail, onTimeoutCheck, type ComboState } from '@/shared/combo';
import { FAIL_PENALTY_FLOORS } from '@/shared/constants';
import { apiFetch } from '@/lib/match-network';

const SHIELD_WINDOW_MS = 1500;
const MINE_LOCK_MS = 1000;

interface UseResultBeanstalk { kind: 'beanstalk'; userId: string; fromFloor: number; toFloor: number; }
interface UseResultMine { kind: 'mine'; targetUserId: string; targetFloor: number; }
interface UseResultBomb { kind: 'bomb'; targetUserId: string; triggerAtMs: number; durationMs: number; }
type UseResult = UseResultBeanstalk | UseResultMine | UseResultBomb;

interface GameState {
  matchId: string | null;
  goalFloor: number;
  stairs: Stair[];
  playerFloor: number;
  maxFloorReached: number;
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

  // M3 fields
  equippedSlots: (string | null)[];
  inventory: Record<string, number>;
  mines: number[];
  bombActiveUntilMs: number | null;
  beanstalkJumpAt: { fromFloor: number; toFloor: number; atMs: number } | null;
  shieldArmedUntilMs: number;
  shieldConsumed: boolean;
  pendingTickEvent: 'beanstalk_use' | 'mine_hit' | 'shield_used' | null;

  init(args: { matchId: string; goalFloor: number; stairs: Stair[]; botDifficulty: BotDifficulty }): void;
  handleTap(dir: 'L' | 'R', atMs: number): void;
  tickTimers(atMs: number): void;
  setOpponentFloor(floor: number): void;
  setBotFloor(floor: number): void;
  setMatchStartAt(startAtMs: number | null): void;
  setOpponentDisconnectedGrace(remainingMs: number | null): void;
  setOpponentResumed(): void;
  applyMatchEnded(payload: MatchEnded): void;
  end(reason: FinalResult['endReason']): void;

  // M3 actions
  setEquippedSlots(slots: (string | null)[]): void;
  setInventory(inv: Record<string, number>): void;
  useSlot(index: number): Promise<void>;
  applyMine(floor: number): void;
  applyBomb(atMs: number, durationMs: number): void;
  applyBeanstalkJump(from: number, to: number, atMs: number): void;
  applyItemPicked(itemId: string, slotIndex: number): void;
  armShield(atMs: number): void;
  consumeShield(): void;
  consumePendingTickEvent(): 'beanstalk_use' | 'mine_hit' | 'shield_used' | null;
}

export const useGame = create<GameState>((set, get) => ({
  matchId: null,
  goalFloor: 100,
  stairs: [],
  playerFloor: 0,
  maxFloorReached: 0,
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

  equippedSlots: [null, null, null],
  inventory: { bomb: 0, mine: 0, beanstalk: 0 },
  mines: [],
  bombActiveUntilMs: null,
  beanstalkJumpAt: null,
  shieldArmedUntilMs: 0,
  shieldConsumed: false,
  pendingTickEvent: null,

  init({ matchId, goalFloor, stairs, botDifficulty }) {
    set({
      matchId, goalFloor, stairs, botDifficulty,
      playerFloor: 0, maxFloorReached: 0, opponentFloor: 0,
      combo: createComboState(),
      coinsCollected: 0, failCount: 0, inputLockedUntil: 0,
      endedReason: null, matchStartAtMs: null, opponentDisconnectedGraceMs: null,
      equippedSlots: [null, null, null],
      inventory: { bomb: 0, mine: 0, beanstalk: 0 },
      mines: [],
      bombActiveUntilMs: null,
      beanstalkJumpAt: null,
      shieldArmedUntilMs: 0,
      shieldConsumed: false,
      pendingTickEvent: null,
    });
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

      let inputLockedUntil = s.inputLockedUntil;
      let mines = s.mines;
      let pendingTickEvent = s.pendingTickEvent;
      if (mines.includes(playerFloor)) {
        inputLockedUntil = atMs + MINE_LOCK_MS;
        mines = mines.filter((f) => f !== playerFloor);
        pendingTickEvent = 'mine_hit';
      }

      let shieldArmedUntilMs = s.shieldArmedUntilMs;
      let shieldConsumed = s.shieldConsumed;
      if (combo.combo >= 20 && s.combo.combo < 20) {
        shieldArmedUntilMs = atMs + SHIELD_WINDOW_MS;
        shieldConsumed = false;
      }
      if (combo.combo === 0) {
        shieldArmedUntilMs = 0;
        shieldConsumed = false;
      }

      const maxFloorReached = Math.max(s.maxFloorReached, playerFloor);
      set({ playerFloor, maxFloorReached, combo, coinsCollected, inputLockedUntil, mines, shieldArmedUntilMs, shieldConsumed, pendingTickEvent });
      if (playerFloor >= s.goalFloor) get().end('reached_goal');
    } else {
      // M3 shield: time-windowed, separate from combo.shieldAvailable
      if (s.combo.combo >= 20 && atMs <= s.shieldArmedUntilMs && !s.shieldConsumed) {
        set({ shieldConsumed: true, pendingTickEvent: 'shield_used' });
        return;
      }
      // Force a real fail: bypass combo.shieldAvailable since M3 owns shield semantics.
      const combo: ComboState = {
        combo: 0,
        maxCombo: s.combo.maxCombo,
        lastTapAt: -1,
        shieldAvailable: false,
        speed: 1.0,
        fever: false,
      };
      const playerFloor = Math.max(0, s.playerFloor - FAIL_PENALTY_FLOORS);
      set({
        playerFloor, combo,
        failCount: s.failCount + 1,
        inputLockedUntil: atMs + 400,
        shieldArmedUntilMs: 0,
        shieldConsumed: false,
      });
    }
  },

  tickTimers(atMs) {
    const s = get();
    const combo = onTimeoutCheck(s.combo, atMs);
    if (combo !== s.combo) {
      const patch: Partial<GameState> = { combo };
      if (combo.combo === 0) {
        patch.shieldArmedUntilMs = 0;
        patch.shieldConsumed = false;
      }
      set(patch);
    }
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

  // M3 actions

  setEquippedSlots(slots) {
    const padded = slots.concat([null, null, null]).slice(0, 3);
    set({ equippedSlots: padded });
  },

  setInventory(inv) {
    set({ inventory: { bomb: 0, mine: 0, beanstalk: 0, ...inv } });
  },

  async useSlot(index) {
    const s = get();
    const itemId = s.equippedSlots[index];
    if (!itemId || !s.matchId) return;

    const optimistic = s.equippedSlots.slice();
    optimistic[index] = null;
    set({ equippedSlots: optimistic });

    let res: { ok?: boolean; result?: UseResult; error?: string } | null = null;
    try {
      const r = await apiFetch(`/api/matches/${s.matchId}/items/use`, {
        method: 'POST',
        body: JSON.stringify({ itemId }),
      });
      res = await r.json();
    } catch {
      res = null;
    }

    if (!res?.ok || !res.result) {
      const rollback = get().equippedSlots.slice();
      rollback[index] = itemId;
      set({ equippedSlots: rollback });
      return;
    }

    const result = res.result;
    if (result.kind === 'beanstalk') {
      const atMs = performance.now();
      get().applyBeanstalkJump(result.fromFloor, result.toFloor, atMs);
      set({
        playerFloor: result.toFloor,
        maxFloorReached: Math.max(get().maxFloorReached, result.toFloor),
        pendingTickEvent: 'beanstalk_use',
      });
    }
    // mine/bomb visual side-effects come back via Pusher (mine_placed/bomb_triggered)
    // and are applied by the adapter binding.
  },

  applyMine(floor) {
    set({ mines: [...get().mines, floor] });
  },

  applyBomb(atMs, durationMs) {
    set({ bombActiveUntilMs: atMs + durationMs });
  },

  applyBeanstalkJump(from, to, atMs) {
    set({ beanstalkJumpAt: { fromFloor: from, toFloor: to, atMs } });
  },

  applyItemPicked(itemId, slotIndex) {
    const slots = get().equippedSlots.slice();
    if (slotIndex >= 0 && slotIndex < 3 && slots[slotIndex] === null) {
      slots[slotIndex] = itemId;
      set({ equippedSlots: slots });
    }
  },

  armShield(atMs) {
    set({ shieldArmedUntilMs: atMs + SHIELD_WINDOW_MS, shieldConsumed: false });
  },

  consumeShield() {
    set({ shieldConsumed: true });
  },

  consumePendingTickEvent() {
    const ev = get().pendingTickEvent;
    if (ev) set({ pendingTickEvent: null });
    return ev;
  },
}));
