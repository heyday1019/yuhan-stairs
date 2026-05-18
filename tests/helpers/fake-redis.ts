import type { RedisClient } from '@/server/redis';

export function makeFakeRedis(): RedisClient {
  const kv = new Map<string, string>();
  const z = new Map<string, Map<string, number>>(); // key → member → score
  const lists = new Map<string, string[]>();
  return {
    async get(k) { return kv.get(k) ?? null; },
    async set(k, v, opts) {
      if (opts?.nx && kv.has(k)) return null;
      kv.set(k, v);
      return 'OK';
    },
    async del(...keys) {
      let n = 0;
      for (const k of keys) {
        if (kv.delete(k)) n++;
        lists.delete(k);
      }
      return n;
    },
    async zadd(k, m) {
      const set = z.get(k) ?? new Map();
      const wasNew = !set.has(m.member);
      set.set(m.member, m.score);
      z.set(k, set);
      return wasNew ? 1 : 0;
    },
    async zrange(k, start, stop) {
      const set = z.get(k);
      if (!set) return [];
      const sorted = [...set.entries()].sort((a, b) => a[1] - b[1]);
      const end = stop < 0 ? sorted.length + stop + 1 : stop + 1;
      return sorted.slice(start, end).map(([m]) => m);
    },
    async zrem(k, ...members) {
      const set = z.get(k);
      if (!set) return 0;
      let n = 0;
      for (const m of members) if (set.delete(m)) n++;
      return n;
    },
    async zremrangebyscore(k, min, max) {
      const set = z.get(k);
      if (!set) return 0;
      const minN = min === '-inf' ? -Infinity : Number(min);
      const maxN = max === '+inf' ? Infinity : Number(max);
      let n = 0;
      for (const [m, s] of [...set.entries()]) if (s >= minN && s <= maxN) { set.delete(m); n++; }
      return n;
    },
    async rpush(k, ...vals) {
      const arr = lists.get(k) ?? [];
      arr.push(...vals);
      lists.set(k, arr);
      return arr.length;
    },
    async lrange(k, s, e) {
      const arr = lists.get(k) ?? [];
      const end = e === -1 ? arr.length : e + 1;
      return arr.slice(s, end);
    },
    async lrem(k, count, val) {
      const arr = lists.get(k) ?? [];
      const out: string[] = [];
      let removed = 0;
      for (const v of arr) {
        if (v === val && (count === 0 || removed < count)) { removed++; continue; }
        out.push(v);
      }
      lists.set(k, out);
      return removed;
    },
    async expire(_k, _s) { return 1; },
  };
}
