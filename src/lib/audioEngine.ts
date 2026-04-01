/** 
 * Audio engine using HTML5 Audio + Web Audio API for EQ/Bass Boost.
 * Singleton pattern - one instance manages playback.
 */

const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000];

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private bassBoostFilter: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private connected = false;

  // Callbacks
  onTimeUpdate: ((time: number) => void) | null = null;
  onEnded: (() => void) | null = null;
  onDurationChange: ((dur: number) => void) | null = null;
  onPlay: (() => void) | null = null;
  onPause: (() => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';

    this.audio.addEventListener('timeupdate', () => {
      this.onTimeUpdate?.(this.audio.currentTime);
    });
    this.audio.addEventListener('ended', () => this.onEnded?.());
    this.audio.addEventListener('durationchange', () => {
      this.onDurationChange?.(this.audio.duration);
    });
    this.audio.addEventListener('play', () => this.onPlay?.());
    this.audio.addEventListener('pause', () => this.onPause?.());
  }

  private initAudioContext() {
    if (this.audioCtx) return;
    this.audioCtx = new AudioContext();
    this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
    this.gainNode = this.audioCtx.createGain();

    // Create EQ filters
    this.eqFilters = EQ_FREQUENCIES.map((freq, i) => {
      const filter = this.audioCtx!.createBiquadFilter();
      filter.type = i === 0 ? 'lowshelf' : i === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
      filter.frequency.value = freq;
      filter.gain.value = 0;
      filter.Q.value = 1;
      return filter;
    });

    // Bass boost filter
    this.bassBoostFilter = this.audioCtx.createBiquadFilter();
    this.bassBoostFilter.type = 'lowshelf';
    this.bassBoostFilter.frequency.value = 150;
    this.bassBoostFilter.gain.value = 0;

    // Chain: source -> EQ filters -> bass boost -> gain -> destination
    let lastNode: AudioNode = this.sourceNode;
    for (const filter of this.eqFilters) {
      lastNode.connect(filter);
      lastNode = filter;
    }
    lastNode.connect(this.bassBoostFilter);
    this.bassBoostFilter.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);
    this.connected = true;
  }

  async loadBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    this.audio.src = url;
    this.audio.load();
  }

  async play() {
    if (!this.connected) this.initAudioContext();
    if (this.audioCtx?.state === 'suspended') {
      await this.audioCtx.resume();
    }
    await this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  get isPlaying() {
    return !this.audio.paused;
  }

  get currentTime() {
    return this.audio.currentTime;
  }

  get duration() {
    return this.audio.duration || 0;
  }

  seek(time: number) {
    this.audio.currentTime = time;
  }

  setVolume(vol: number) {
    this.audio.volume = Math.max(0, Math.min(1, vol));
  }

  getVolume() {
    return this.audio.volume;
  }

  setEQBand(index: number, gain: number) {
    if (!this.connected) this.initAudioContext();
    if (this.eqFilters[index]) {
      this.eqFilters[index].gain.value = gain;
    }
  }

  getEQBands(): number[] {
    if (!this.connected) return new Array(8).fill(0);
    return this.eqFilters.map(f => f.gain.value);
  }

  setBassBoost(gain: number) {
    if (!this.connected) this.initAudioContext();
    if (this.bassBoostFilter) {
      this.bassBoostFilter.gain.value = gain;
    }
  }

  getBassBoost(): number {
    return this.bassBoostFilter?.gain.value ?? 0;
  }

  destroy() {
    this.audio.pause();
    this.audio.src = '';
    this.audioCtx?.close();
  }
}

// Singleton
export const audioEngine = new AudioEngine();
export { EQ_FREQUENCIES };
