import { describe, it, expect } from 'vitest';
import { createBot, advanceBot } from '@/shared/bot';
import { generateStairs } from '@/shared/stair-generator';

describe('bot simulator', () => {
  it('easy bot reaches goal at ~1.5x duration of normal', () => {
    const stairs = generateStairs('seed-bot', 100);
    let easy = createBot({ stairs, difficulty: 'easy', startedAt: 0 });
    let normal = createBot({ stairs, difficulty: 'normal', startedAt: 0 });
    while (easy.floor < 100) easy = advanceBot(easy, easy.nextTickAt);
    while (normal.floor < 100) normal = advanceBot(normal, normal.nextTickAt);
    expect(easy.elapsedMs / normal.elapsedMs).toBeGreaterThan(1.3);
    expect(easy.elapsedMs / normal.elapsedMs).toBeLessThan(1.7);
  });

  it('hard bot reaches goal faster than normal', () => {
    const stairs = generateStairs('seed-bot', 100);
    let hard = createBot({ stairs, difficulty: 'hard', startedAt: 0 });
    let normal = createBot({ stairs, difficulty: 'normal', startedAt: 0 });
    while (hard.floor < 100) hard = advanceBot(hard, hard.nextTickAt);
    while (normal.floor < 100) normal = advanceBot(normal, normal.nextTickAt);
    expect(hard.elapsedMs).toBeLessThan(normal.elapsedMs);
  });

  it('hard bot occasionally fails (rare)', () => {
    const stairs = generateStairs('seed-bot-2', 200);
    let hard = createBot({ stairs, difficulty: 'hard', startedAt: 0 });
    while (hard.floor < 200) hard = advanceBot(hard, hard.nextTickAt);
    expect(hard.failCount).toBeGreaterThan(0);
    expect(hard.failCount).toBeLessThan(15);
  });
});
