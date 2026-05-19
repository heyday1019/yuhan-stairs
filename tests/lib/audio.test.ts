import { describe, it, expect, beforeEach, vi } from 'vitest';
import { audio } from '@/lib/audio';

class FakeBufferSource {
  onended: any;
  loop = false;
  buffer: any = null;
  playbackRate = { value: 1 };
  connect = vi.fn(() => this);
  start = vi.fn();
  stop = vi.fn();
}
class FakeGain {
  gain = { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  connect = vi.fn(() => this);
}
class FakeAudioCtx {
  destination: any = {};
  currentTime = 0;
  state = 'running';
  createBufferSource() { return new FakeBufferSource(); }
  createGain() { return new FakeGain(); }
  decodeAudioData(_buf: ArrayBuffer) { return Promise.resolve({ duration: 30 } as AudioBuffer); }
  resume() { return Promise.resolve(); }
}

const memoryStore: Record<string, string> = {};
const fakeLocalStorage = {
  getItem: (k: string) => (k in memoryStore ? memoryStore[k] : null),
  setItem: (k: string, v: string) => { memoryStore[k] = v; },
  removeItem: (k: string) => { delete memoryStore[k]; },
  clear: () => { for (const k of Object.keys(memoryStore)) delete memoryStore[k]; },
};

beforeEach(() => {
  vi.stubGlobal('AudioContext', FakeAudioCtx);
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })));
  vi.stubGlobal('localStorage', fakeLocalStorage);
  fakeLocalStorage.clear();
  audio.__resetForTest();
});

describe('audio', () => {
  it('preloads tracks via fetch + decodeAudioData', async () => {
    await audio.loadTracks({ main_theme: '/audio/main.mp3' });
    expect((fetch as any)).toHaveBeenCalledWith('/audio/main.mp3');
  });

  it('play creates source and stores it in playing map', async () => {
    await audio.loadTracks({ main_theme: '/audio/main.mp3' });
    audio.play('main_theme');
    expect(audio.__currentSource('main_theme')).toBeTruthy();
  });

  it('setPlaybackRate changes rate on current source', async () => {
    await audio.loadTracks({ game_loop: '/g.mp3' });
    audio.play('game_loop');
    audio.setPlaybackRate('game_loop', 1.15);
    expect(audio.__currentSource('game_loop')?.playbackRate.value).toBe(1.15);
  });

  it('setMuted(true) drops master gain to 0', async () => {
    await audio.loadTracks({ main_theme: '/audio/main.mp3' });
    audio.play('main_theme');
    audio.setMuted(true);
    expect(audio.__masterGain()).toBe(0);
  });

  it('setMuted persists to localStorage', () => {
    audio.setMuted(true);
    expect(fakeLocalStorage.getItem('audio:muted')).toBe('1');
    audio.setMuted(false);
    expect(fakeLocalStorage.getItem('audio:muted')).toBe('0');
  });

  it('hydrateMutedFromStorage reads "1" as muted', () => {
    fakeLocalStorage.setItem('audio:muted', '1');
    audio.hydrateMutedFromStorage();
    expect(audio.isMuted).toBe(true);
  });

  it('play replaces existing source for the same slot', async () => {
    await audio.loadTracks({ main_theme: '/audio/main.mp3' });
    audio.play('main_theme');
    const first = audio.__currentSource('main_theme');
    audio.play('main_theme');
    const second = audio.__currentSource('main_theme');
    expect(second).not.toBe(first);
  });

  it('play on unknown slot is a no-op', async () => {
    audio.play('does_not_exist');
    expect(audio.__currentSource('does_not_exist')).toBeUndefined();
  });
});
