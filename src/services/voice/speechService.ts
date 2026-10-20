export interface VoiceConfig {
  voiceName: string;
  rate: number;
  pitch: number;
  preferFeminine: boolean;
}

const FEMININE_VOICE_KEYWORDS = [
  'zira', 'jenny', 'aria', 'sonia', 'hazel', 'susan', 'catherine',
  'samantha', 'victoria', 'karen', 'fiona', 'moira', 'tessa', 'female',
  'girl', 'woman', 'stephanie', 'ava', 'allison', 'cortana'
];

export class SpeechService {
  private isSpeaking: boolean = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private speechRate: number = 1.05;
  private pitch: number = 1.1; // Cute, slightly elevated pitch for girlfriend companion
  private preferFeminine: boolean = true;
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.loadConfig();
    this.initVoices();
  }

  private loadConfig() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('breakpoint_voice_config');
        if (saved) {
          const cfg: Partial<VoiceConfig> = JSON.parse(saved);
          if (cfg.rate !== undefined) this.speechRate = cfg.rate;
          if (cfg.pitch !== undefined) this.pitch = cfg.pitch;
          if (cfg.preferFeminine !== undefined) this.preferFeminine = cfg.preferFeminine;
        }
      }
    } catch {}
  }

  private saveConfig() {
    try {
      if (typeof localStorage !== 'undefined') {
        const cfg: VoiceConfig = {
          voiceName: this.selectedVoice?.name || '',
          rate: this.speechRate,
          pitch: this.pitch,
          preferFeminine: this.preferFeminine
        };
        localStorage.setItem('breakpoint_voice_config', JSON.stringify(cfg));
      }
    } catch {}
  }

  private initVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const update = () => {
        this.availableVoices = window.speechSynthesis.getVoices();
        
        let savedVoiceName: string | null = null;
        try {
          if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('breakpoint_voice_config');
            if (saved) savedVoiceName = JSON.parse(saved).voiceName;
          }
        } catch {}

        if (savedVoiceName) {
          const found = this.availableVoices.find(v => v.name === savedVoiceName);
          if (found) {
            this.selectedVoice = found;
            return;
          }
        }

        // Auto-select preferred feminine voice if preferFeminine is true
        if (this.preferFeminine) {
          const feminineVoice = this.findBestFeminineVoice();
          if (feminineVoice) {
            this.selectedVoice = feminineVoice;
            return;
          }
        }

        // Fallback: English voice
        const fallback = this.availableVoices.find(v => v.lang.startsWith('en')) || this.availableVoices[0];
        if (fallback) {
          this.selectedVoice = fallback;
        }
      };

      update();
      window.speechSynthesis.onvoiceschanged = update;
    }
  }

  private isVoiceFeminine(voice: SpeechSynthesisVoice): boolean {
    const lowerName = voice.name.toLowerCase();
    return FEMININE_VOICE_KEYWORDS.some(kw => lowerName.includes(kw));
  }

  findBestFeminineVoice(): SpeechSynthesisVoice | null {
    const enVoices = this.availableVoices.filter(v => v.lang.startsWith('en'));
    // 1. Zira, Jenny, or Aria (high quality Windows SAPI/OneCore voices)
    const topPick = enVoices.find(v => {
      const n = v.name.toLowerCase();
      return n.includes('zira') || n.includes('jenny') || n.includes('aria');
    });
    if (topPick) return topPick;

    // 2. Any other feminine-matching English voice
    const anyFemEn = enVoices.find(v => this.isVoiceFeminine(v));
    if (anyFemEn) return anyFemEn;

    // 3. Any feminine voice in any language
    const anyFem = this.availableVoices.find(v => this.isVoiceFeminine(v));
    return anyFem || null;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.availableVoices;
  }

  getFeminineVoices(): SpeechSynthesisVoice[] {
    return this.availableVoices.filter(v => this.isVoiceFeminine(v));
  }

  hasFeminineVoiceInstalled(): boolean {
    return this.getFeminineVoices().length > 0;
  }

  getSelectedVoice(): SpeechSynthesisVoice | null {
    return this.selectedVoice;
  }

  setSelectedVoice(voiceName: string) {
    const v = this.availableVoices.find(voice => voice.name === voiceName);
    if (v) {
      this.selectedVoice = v;
      this.saveConfig();
    }
  }

  setSpeechRate(rate: number) {
    this.speechRate = Math.max(0.5, Math.min(2.0, rate));
    this.saveConfig();
  }

  getSpeechRate(): number {
    return this.speechRate;
  }

  setPitch(pitch: number) {
    this.pitch = Math.max(0.5, Math.min(1.5, pitch));
    this.saveConfig();
  }

  getPitch(): number {
    return this.pitch;
  }

  setPreferFeminine(prefer: boolean) {
    this.preferFeminine = prefer;
    if (prefer) {
      const best = this.findBestFeminineVoice();
      if (best) this.selectedVoice = best;
    }
    this.saveConfig();
  }

  getPreferFeminine(): boolean {
    return this.preferFeminine;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  getVoiceConfig(): VoiceConfig {
    return {
      voiceName: this.selectedVoice?.name || '',
      rate: this.speechRate,
      pitch: this.pitch,
      preferFeminine: this.preferFeminine
    };
  }

  // Interruption / Barge-in
  cancelSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      window.dispatchEvent(new CustomEvent('breakpoint:speech_end'));
    }
  }

  previewVoice(sampleText: string = "Hey babe! It's Break Point. I'm ready to hang out, play some games, or help you crush your goals!"): Promise<void> {
    return this.speak(sampleText);
  }

  speak(text: string, onEnd?: () => void): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      // Barge-in: cancel any currently speaking utterance
      this.cancelSpeech();

      // Clean markdown symbols, emojis, and asterisks for natural vocalization
      const cleanText = text
        .replace(/[*#`_~]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/\n+/g, ' ')
        .trim();

      if (!cleanText) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.rate = this.speechRate;
      utterance.pitch = this.pitch;

      utterance.onstart = () => {
        this.isSpeaking = true;
        window.dispatchEvent(new CustomEvent('breakpoint:speech_start'));
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        window.dispatchEvent(new CustomEvent('breakpoint:speech_end'));
        onEnd?.();
        resolve();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        window.dispatchEvent(new CustomEvent('breakpoint:speech_end'));
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }
}

export const speechService = new SpeechService();

