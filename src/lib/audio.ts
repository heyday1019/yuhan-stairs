type Slot = string;

interface Track { buffer: AudioBuffer; }

class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private tracks = new Map<Slot, Track>();
  private playing = new Map<Slot, { source: AudioBufferSourceNode; gain: GainNode }>();
  private muted = false;

  private getAudioContextCtor(): typeof AudioContext | null {
    const g = globalThis as any;
    return (g.AudioContext || g.webkitAudioContext || null) as typeof AudioContext | null;
  }

  private ensureCtx(): boolean {
    if (this.ctx) return true;
    const Ctx = this.getAudioContextCtor();
    if (!Ctx) return false;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    return true;
  }

  async loadTracks(map: Record<Slot, string>): Promise<void> {
    if (!this.ensureCtx()) return;
    for (const [slot, url] of Object.entries(map)) {
      if (this.tracks.has(slot)) continue;
      const arr = await fetch(url).then((r) => r.arrayBuffer());
      const buffer = await this.ctx!.decodeAudioData(arr);
      this.tracks.set(slot, { buffer });
    }
  }

  play(slot: Slot, opts: { loop?: boolean; fadeMs?: number } = {}): void {
    const { loop = true, fadeMs = 0 } = opts;
    if (!this.ensureCtx()) return;
    const track = this.tracks.get(slot);
    if (!track) return;
    this.stop(slot, { fadeMs: 0 });

    const source = this.ctx!.createBufferSource();
    source.buffer = track.buffer;
    source.loop = loop;
    const gain = this.ctx!.createGain();
    gain.gain.value = fadeMs > 0 ? 0 : 1;
    source.connect(gain).connect(this.master!);
    source.start();
    if (fadeMs > 0) gain.gain.linearRampToValueAtTime(1, this.ctx!.currentTime + fadeMs / 1000);
    this.playing.set(slot, { source, gain });
  }

  stop(slot: Slot, opts: { fadeMs?: number } = {}): void {
    const { fadeMs = 100 } = opts;
    const cur = this.playing.get(slot);
    if (!cur) return;
    if (fadeMs > 0 && this.ctx) {
      cur.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeMs / 1000);
      setTimeout(() => { try { cur.source.stop(); } catch { /* already stopped */ } }, fadeMs + 20);
    } else {
      try { cur.source.stop(); } catch { /* already stopped */ }
    }
    this.playing.delete(slot);
  }

  crossfade(from: Slot, to: Slot, ms = 300): void {
    this.stop(from, { fadeMs: ms });
    this.play(to, { fadeMs: ms });
  }

  setPlaybackRate(slot: Slot, rate: number): void {
    const cur = this.playing.get(slot);
    if (cur) cur.source.playbackRate.value = rate;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 1;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('audio:muted', muted ? '1' : '0');
    }
  }

  get isMuted(): boolean { return this.muted; }

  hydrateMutedFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    this.muted = localStorage.getItem('audio:muted') === '1';
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
  }

  __resetForTest(): void {
    this.ctx = null;
    this.master = null;
    this.tracks.clear();
    this.playing.clear();
    this.muted = false;
  }
  __currentSource(slot: Slot): AudioBufferSourceNode | undefined {
    return this.playing.get(slot)?.source;
  }
  __masterGain(): number {
    return this.master?.gain.value ?? 1;
  }
}

export const audio = new Audio();
