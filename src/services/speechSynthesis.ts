// Mobile Web SpeechSynthesis service
// Handles auto-playback for Chinese translation (when unmuted) and Mexican Spanish translation

class SpeechSynthesisService {
  private isMuted: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      this.voices = window.speechSynthesis.getVoices();
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  private getBestVoice(lang: 'zh-CN' | 'es-MX'): SpeechSynthesisVoice | null {
    if (this.voices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }

    if (lang === 'zh-CN') {
      // Find high-quality Chinese voices (e.g., Tingting, Sinji, Xiaoxiao, Google Chinese)
      const zhVoices = this.voices.filter(v => v.lang.replace('_', '-').startsWith('zh'));
      const naturalZh = zhVoices.find(v => 
        v.name.includes('Natural') || 
        v.name.includes('Online') || 
        v.name.includes('Tingting') || 
        v.name.includes('Xiaoxiao') || 
        v.name.includes('Siri')
      );
      return naturalZh || zhVoices[0] || null;
    } else {
      // Find Mexican Spanish or Latin American Spanish voices
      const esMxVoices = this.voices.filter(v => 
        v.lang.replace('_', '-').toLowerCase().includes('es-mx') || 
        v.name.toLowerCase().includes('mexico')
      );
      if (esMxVoices.length > 0) return esMxVoices[0];

      // Fallback to any Spanish voice
      const esVoices = this.voices.filter(v => v.lang.replace('_', '-').startsWith('es'));
      const naturalEs = esVoices.find(v => 
        v.name.includes('Paulina') || 
        v.name.includes('Natural') || 
        v.name.includes('Siri')
      );
      return naturalEs || esVoices[0] || null;
    }
  }

  speak(text: string, lang: 'zh-CN' | 'es-MX', force: boolean = false): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      // If muted and not forced, skip
      if (this.isMuted && !force) {
        resolve();
        return;
      }

      if (!text || text.trim() === '') {
        resolve();
        return;
      }

      // Stop previous utterance to avoid long speech queues
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = lang;
      utterance.rate = lang === 'zh-CN' ? 1.05 : 1.0; // Slightly brisk for simultaneous interpreting
      utterance.pitch = 1.0;

      const voice = this.getBestVoice(lang);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        resolve();
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis speak failed:', err);
        resolve();
      }
    });
  }

  stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const speechSynthesisService = new SpeechSynthesisService();
