import { describe, it, expect, beforeEach } from 'vitest';
import { getOrCreateDeviceId, DEVICE_ID_KEY } from '@/lib/device-id';

describe('getOrCreateDeviceId', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _store: {} as Record<string, string>,
      getItem(k: string) { return this._store[k] ?? null; },
      setItem(k: string, v: string) { this._store[k] = v; },
      removeItem(k: string) { delete this._store[k]; },
      clear() { this._store = {}; },
      key() { return null; },
      length: 0,
    } as Storage;
  });

  it('생성 후 동일 호출에서 같은 값 반환', () => {
    const a = getOrCreateDeviceId();
    const b = getOrCreateDeviceId();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('localStorage에 영속', () => {
    const id = getOrCreateDeviceId();
    expect(localStorage.getItem(DEVICE_ID_KEY)).toBe(id);
  });
});
