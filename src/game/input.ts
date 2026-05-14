export type TapDirection = 'L' | 'R';
export type SwipeDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface InputCallbacks {
  onTap(dir: TapDirection, atMs: number): void;
  onSwipe(dir: SwipeDirection, atMs: number): void;
}

const SWIPE_MIN_PX = 30;

export function attachInput(canvas: HTMLCanvasElement, cb: InputCallbacks): () => void {
  let startX = 0, startY = 0, startMs = 0, active = false;

  const onDown = (e: PointerEvent) => {
    startX = e.clientX; startY = e.clientY; startMs = performance.now(); active = true;
  };
  const onUp = (e: PointerEvent) => {
    if (!active) return;
    active = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx < SWIPE_MIN_PX && ady < SWIPE_MIN_PX) {
      const rect = canvas.getBoundingClientRect();
      const dir: TapDirection = (startX - rect.left) < rect.width / 2 ? 'L' : 'R';
      cb.onTap(dir, performance.now());
    } else if (adx > ady) {
      cb.onSwipe(dx > 0 ? 'RIGHT' : 'LEFT', performance.now());
    } else {
      cb.onSwipe(dy > 0 ? 'DOWN' : 'UP', performance.now());
    }
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', () => (active = false));
  return () => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
  };
}
