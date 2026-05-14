// Max floors/sec at fever (combo 50+): ~20. Allow some headroom for jitter.
const MAX_FLOORS_PER_SEC = 25;
const MIN_TICK_INTERVAL_MS = 100;

export function validateFloorProgression(args: {
  prevFloor: number;
  prevAt: number;
  nextFloor: number;
  nextAt: number;
  goalFloor?: number;
  allowItemJump?: number;       // additional floors permitted in one tick due to beanstalk
}): boolean {
  if (args.nextFloor < args.prevFloor) return false;                 // backward only via fail penalty (separate event)
  if (args.goalFloor != null && args.nextFloor > args.goalFloor) return false;
  const elapsedMs = Math.max(1, args.nextAt - args.prevAt);
  const maxDelta = Math.ceil((elapsedMs / 1000) * MAX_FLOORS_PER_SEC) + (args.allowItemJump ?? 0);
  return args.nextFloor - args.prevFloor <= maxDelta;
}

export function validateTickRate(args: { prevAt: number; nextAt: number }): boolean {
  return args.nextAt - args.prevAt >= MIN_TICK_INTERVAL_MS;
}
