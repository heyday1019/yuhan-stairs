// M1: local-only stub. Replaced with real Toss SDK in M2.
export type TossUser = { id: string; nickname: string };

export function getStubTossUser(): TossUser {
  const id = process.env.TOSS_AUTH_STUB_USER_ID ?? 'local-dev-user-001';
  return { id, nickname: `유저-${id.slice(-4)}` };
}
