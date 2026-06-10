import { describe, it, expect } from 'vitest';
import { buildLeaderboardResult } from '@/server/leaderboard';

type Row = { userId: string; nickname: string; totalScore: number };

describe('buildLeaderboardResult', () => {
  it('assigns ranks in order and returns top limit entries', () => {
    const rows: Row[] = [
      { userId: 'u1', nickname: 'Alice', totalScore: 1000 },
      { userId: 'u2', nickname: 'Bob', totalScore: 800 },
      { userId: 'u3', nickname: 'Carol', totalScore: 600 },
    ];
    const result = buildLeaderboardResult(rows, 2, null);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({ rank: 1, nickname: 'Alice', totalScore: 1000 });
    expect(result.entries[1]).toMatchObject({ rank: 2, nickname: 'Bob', totalScore: 800 });
  });

  it('myEntry is null when myUserId is within top limit', () => {
    const rows: Row[] = [{ userId: 'u1', nickname: 'Alice', totalScore: 1000 }];
    expect(buildLeaderboardResult(rows, 10, 'u1').myEntry).toBeNull();
  });

  it('myEntry has rank and score when myUserId is outside top limit', () => {
    const rows: Row[] = [
      { userId: 'u1', nickname: 'Alice', totalScore: 1000 },
      { userId: 'u2', nickname: 'Bob', totalScore: 800 },
      { userId: 'u3', nickname: 'Carol', totalScore: 600 },
    ];
    const result = buildLeaderboardResult(rows, 2, 'u3');
    expect(result.myEntry).toEqual({ rank: 3, totalScore: 600 });
  });

  it('myEntry is null when myUserId has no matches at all', () => {
    const rows: Row[] = [{ userId: 'u1', nickname: 'Alice', totalScore: 1000 }];
    expect(buildLeaderboardResult(rows, 10, 'u99').myEntry).toBeNull();
  });

  it('returns empty entries for empty rows', () => {
    const result = buildLeaderboardResult([], 10, null);
    expect(result.entries).toHaveLength(0);
    expect(result.myEntry).toBeNull();
  });
});
