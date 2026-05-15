import type { OpponentSyncAdapter } from './types';
import type { Stair, BotDifficulty } from '@/shared/types';
import { advanceBot, createBot } from '@/shared/bot';

export function createBotAdapter(args: { stairs: Stair[]; difficulty: BotDifficulty; goalFloor: number }): OpponentSyncAdapter {
  let cancelled = false;
  return {
    start(opts) {
      let state = createBot({ stairs: args.stairs, difficulty: args.difficulty, startedAt: performance.now() });
      const step = () => {
        if (cancelled) return;
        const now = performance.now();
        if (now >= state.nextTickAt) {
          state = advanceBot(state, now);
          opts.onOpponentTick({ floor: state.floor });
          if (state.floor >= args.goalFloor) { opts.onMatchEnded({ reason: 'normal' }); return; }
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    sendTick() { /* bot 모드는 자체 시뮬레이션이라 무시 */ },
    sendFinish() { /* 봇 매치 종료는 기존 /api/matches/[id]/end 라우트에서 처리 */ },
    stop() { cancelled = true; },
  };
}
