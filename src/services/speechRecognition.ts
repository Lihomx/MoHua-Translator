// Web Speech Recognition Service with auto-recovery and Mexican Spanish support
// Compatible with iOS Safari and Android Chrome

type RecognitionCallback = {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: string) => void;
  onListeningChange: (isListening: boolean) => void;
};

class SpeechRecognitionService {
  private recognition: any = null;
  private isListening: boolean = false;
  private shouldKeepListening: boolean = false;
  private currentLang: string = 'es-MX';
  private callbacks: RecognitionCallback | null = null;
  private restartTimeout: any = null;
  private isSupported: boolean = false;

  constructor() {
    this.checkSupport();
  }

  private checkSupport() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.isSupported = Boolean(SpeechRecognition);
    }
  }

  getIsSupported(): boolean {
    return this.isSupported;
  }

  private initRecognition(lang: string) {
    if (!this.isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = lang;
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    let finalTranscript = '';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks?.onListeningChange(true);
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const transcript = item[0]?.transcript || '';
        if (item.isFinal) {
          finalTranscript += transcript + ' ';
          this.callbacks?.onFinal(transcript.trim());
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript.trim()) {
        this.callbacks?.onInterim(interimTranscript.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      // 'no-speech' is common during silence; do not alert user, just let it recover
      if (event.error === 'no-speech') {
        return;
      }
      if (event.error === 'not-allowed') {
        this.shouldKeepListening = false;
        this.callbacks?.onError('麦克风权限被拒绝，请在浏览器地址栏允许麦克风权限后重试');
        this.isListening = false;
        this.callbacks?.onListeningChange(false);
        return;
      }
      console.warn('SpeechRecognition error:', event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.callbacks?.onListeningChange(false);

      // Auto-restart if we should keep continuous listening (critical for mobile browsers)
      if (this.shouldKeepListening) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (this.shouldKeepListening) {
            this.safeStart();
          }
        }, 300);
      }
    };
  }

  startContinuousListening(lang: string = 'es-MX', callbacks: RecognitionCallback) {
    this.callbacks = callbacks;
    this.currentLang = lang;
    this.shouldKeepListening = true;
    this.initRecognition(lang);
    this.safeStart();
  }

  // Temporary single-session listening (e.g. for Push-to-Talk "中译西")
  startPushToTalk(lang: string = 'zh-CN', callbacks: RecognitionCallback) {
    this.stopContinuousListening();
    this.callbacks = callbacks;
    this.currentLang = lang;
    this.shouldKeepListening = false;
    this.initRecognition(lang);
    this.safeStart();
  }

  stopPushToTalk(): Promise<void> {
    return new Promise((resolve) => {
      this.shouldKeepListening = false;
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (e) {
          // ignore
        }
      }
      setTimeout(resolve, 200);
    });
  }

  private safeStart() {
    if (!this.recognition) {
      this.initRecognition(this.currentLang);
    }
    try {
      this.recognition.start();
    } catch (err: any) {
      // If already started or aborting, ignore
      if (err.name !== 'InvalidStateError') {
        console.warn('Recognition start exception:', err);
      }
    }
  }

  stopContinuousListening() {
    this.shouldKeepListening = false;
    clearTimeout(this.restartTimeout);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        // ignore
      }
    }
    this.isListening = false;
    this.callbacks?.onListeningChange(false);
  }

  getListening(): boolean {
    return this.isListening;
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
