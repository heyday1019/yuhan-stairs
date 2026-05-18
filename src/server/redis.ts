import { Redis } from '@upstash/redis';

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { ex?: number; nx?: boolean }): Promise<'OK' | null>;
  del(...keys: string[]): Promise<number>;
  zadd(key: string, member: { score: number; member: string }): Promise<number | null>;
  zrange(key: string, start: number, stop: number, opts?: { withScores?: boolean }): Promise<string[]>;
  zrem(key: string, ...members: string[]): Promise<number>;
  zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number>;
  rpush(key: string, ...values: string[]): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  lrem(key: string, count: number, value: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number | boolean>;
}

let _client: RedisClient | null = null;

export function getRedis(): RedisClient {
  if (_client) return _client;
  const r = Redis.fromEnv();
  _client = {
    get: (k) => r.get(k),
    set: (k, v, o) => r.set(k, v, o as never) as Promise<'OK' | null>,
    del: (...keys) => r.del(...keys),
    zadd: (k, m) => r.zadd(k, m) as Promise<number | null>,
    zrange: (k, s, e, o) => r.zrange(k, s, e, o as never) as Promise<string[]>,
    zrem: (k, ...m) => r.zrem(k, ...m),
    zremrangebyscore: (k, mn, mx) => r.zremrangebyscore(k, mn as never, mx as never),
    rpush: (k, ...vals) => r.rpush(k, ...vals),
    lrange: (k, s, e) => r.lrange(k, s, e) as Promise<string[]>,
    lrem: (k, c, v) => r.lrem(k, c, v),
    expire: (k, s) => r.expire(k, s),
  };
  return _client;
}

export function setRedisForTest(c: RedisClient | null) { _client = c; }
