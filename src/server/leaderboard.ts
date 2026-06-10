import { sql } from 'drizzle-orm';

export interface LeaderboardRow {
  userId: string;
  nickname: string;
  totalScore: number;
}

export interface LeaderboardEntry extends LeaderboardRow {
  rank: number;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  myEntry: { rank: number; totalScore: number } | null;
}

/** Pure function — testable without DB. rows must be pre-sorted by totalScore DESC, nickname ASC. */
export function buildLeaderboardResult(
  rows: LeaderboardRow[],
  limit: number,
  myUserId: string | null,
): LeaderboardResult {
  const ranked: LeaderboardEntry[] = rows.map((r, i) => ({ ...r, rank: i + 1 }));
  const entries = ranked.slice(0, limit);
  const inTop = entries.some((e) => e.userId === myUserId);
  const myRanked = myUserId ? ranked.find((r) => r.userId === myUserId) : undefined;
  const myEntry =
    myRanked && !inTop ? { rank: myRanked.rank, totalScore: myRanked.totalScore } : null;
  return { entries, myEntry };
}

type DbWithExecute = {
  execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }>;
};

export async function getLeaderboard(
  db: DbWithExecute,
  tab: 'all' | 'weekly',
  limit: number,
  myUserId: string | null,
): Promise<LeaderboardResult> {
  const weeklyClause =
    tab === 'weekly'
      ? sql`AND m.ended_at > NOW() - INTERVAL '7 days'`
      : sql``;

  const { rows } = await db.execute(sql`
    SELECT
      u.id            AS user_id,
      u.nickname,
      COALESCE(SUM(mp.final_score), 0)::int AS total_score
    FROM match_participants mp
    JOIN matches m  ON mp.match_id = m.id
    JOIN users u    ON mp.user_id  = u.id
    WHERE m.status        = 'ended'
      AND m.flagged       = false
      AND m.match_type    = 'ranked'
      AND mp.user_id IS NOT NULL
      ${weeklyClause}
    GROUP BY u.id, u.nickname
    ORDER BY total_score DESC, u.nickname ASC
  `);

  const leaderboardRows: LeaderboardRow[] = rows.map((r) => ({
    userId: String(r.user_id),
    nickname: String(r.nickname),
    totalScore: Number(r.total_score),
  }));

  return buildLeaderboardResult(leaderboardRows, limit, myUserId);
}
