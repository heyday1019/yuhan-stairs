import { describe, it, expect, beforeEach, vi } from 'vitest';
import { canAuthorize, type ParticipantLookup } from '@/app/api/pusher/auth/route';

describe('canAuthorize', () => {
  const lookup: ParticipantLookup = {
    isParticipant: vi.fn(async (matchId: string, userId: string) => matchId === 'm1' && (userId === 'u1' || userId === 'u2')),
  };
  beforeEach(() => vi.clearAllMocks());

  it('private-user-{self} 허용', async () => {
    const r = await canAuthorize('private-user-u1', 'u1', lookup);
    expect(r.ok).toBe(true);
  });

  it('private-user-{other} 거부', async () => {
    const r = await canAuthorize('private-user-u1', 'u2', lookup);
    expect(r.ok).toBe(false);
  });

  it('presence-match 참가자 허용', async () => {
    const r = await canAuthorize('presence-match-m1', 'u1', lookup);
    expect(r.ok).toBe(true);
  });

  it('presence-match 비참가자 거부', async () => {
    const r = await canAuthorize('presence-match-m1', 'u9', lookup);
    expect(r.ok).toBe(false);
  });

  it('알 수 없는 채널 거부', async () => {
    const r = await canAuthorize('public-foo', 'u1', lookup);
    expect(r.ok).toBe(false);
  });
});
