// Web Speech Recognition Service with High-Sensitivity Auto-Gain Control (AGC),
// Watchdog Auto-Recovery, and In-Flight Speech Salvager (Prevents dropped words/sentences).
// Fully tuned for Mexican Spanish (es-MX) simultaneous interpreting on Mobile Chrome/Edge/Safari/PDA.

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
  private silenceFlushTimer: any = null;
  private watchdogTimer: any = null;
  private isSupported: boolean = false;
  private audioStream: MediaStream | null = null;

  // In-flight speech tracking (salvages words when Chrome resets without isFinal=true)
  private latestInterimText: string = '';
  private lastFlushedText: string = '';
  private lastFlushTimestamp: number = 0;

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

  /**
   * Hardware-level Microphone Booster:
   * Requests AGC (Automatic Gain Control) to amplify soft/quiet speech (+15dB boost)
   * and disables aggressive noise suppression so quiet speech isn't filtered out as silence.
   */
  private async engageMicrophoneBoost() {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      if (!this.audioStream) {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            autoGainControl: true,    // 硬件级自动增益：大幅提升弱音、轻声拾音灵敏度
            echoCancellation: true,   // 回声消除
            noiseSuppression: false,  // 禁用激进降噪：防止把弱声当作背景噪音过滤掉
          },
        });
      }
    } catch (err) {
      console.warn('Microphone AGC booster init skipped (falling back to standard capture):', err);
    }
  }

  private releaseMicrophoneBoost() {
    if (this.audioStream) {
      try {
        this.audioStream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        // ignore
      }
      this.audioStream = null;
    }
  }

  private flushSpeech(text: string) {
    const cleaned = text.trim();
    if (!cleaned || cleaned.length < 1) return;

    const now = Date.now();
    // Duplication guard: avoid emitting the exact same utterance within 1.5 seconds
    if (cleaned === this.lastFlushedText && (now - this.lastFlushTimestamp < 1500)) {
      return;
    }

    // Substring duplicate guard: if new text is already suffix of recently emitted
    if (cleaned.length <= this.lastFlushedText.length && this.lastFlushedText.endsWith(cleaned) && (now - this.lastFlushTimestamp < 2000)) {
      return;
    }

    this.lastFlushedText = cleaned;
    this.lastFlushTimestamp = now;
    this.latestInterimText = '';
    clearTimeout(this.silenceFlushTimer);

    this.callbacks?.onFinal(cleaned);
  }

  private initRecognition(lang: string) {
    if (!this.isSupported) return;

    // Clean up prior native handle
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = lang;
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks?.onListeningChange(true);
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const transcript = item[0]?.transcript || '';

        if (item.isFinal) {
          const finalClause = transcript.trim();
          if (finalClause) {
            this.flushSpeech(finalClause);
          }
        } else {
          interim += transcript;
        }
      }

      const trimmedInterim = interim.trim();
      if (trimmedInterim) {
        this.latestInterimText = trimmedInterim;
        this.callbacks?.onInterim(trimmedInterim);

        // Smart Clause Flush:
        // If the speaker pauses for 1400ms (natural sentence boundary) and Chrome hasn't finalized yet,
        // stop recognition to commit the audio buffer. This cleanly fires onend, salvages the sentence,
        // and auto-restarts a fresh recognition session in 100ms with zero duplicate words!
        clearTimeout(this.silenceFlushTimer);
        this.silenceFlushTimer = setTimeout(() => {
          if (this.latestInterimText.trim() && this.isListening) {
            try {
              this.recognition?.stop();
            } catch (e) {
              // ignore
            }
          }
        }, 1400);
      } else {
        this.latestInterimText = '';
        clearTimeout(this.silenceFlushTimer);
      }
    };

    this.recognition.onerror = (event: any) => {
      // 'no-speech' is expected during quiet pauses; keep listening alive
      if (event.error === 'no-speech') {
        return;
      }
      if (event.error === 'not-allowed') {
        this.shouldKeepListening = false;
        this.stopWatchdog();
        this.callbacks?.onError('麦克风权限被拒绝，请在浏览器地址栏允许麦克风权限后重试');
        this.isListening = false;
        this.callbacks?.onListeningChange(false);
        return;
      }
      if (event.error === 'service-not-allowed' || event.error === 'network' || event.error === 'audio-capture') {
        this.shouldKeepListening = false;
        this.stopWatchdog();
        this.callbacks?.onError('PDA/设备未安装 Google 语音识别引擎。请点击底部【打字】模式直接输入，或在PDA安装 Google 语音服务。');
        this.isListening = false;
        this.callbacks?.onListeningChange(false);
        return;
      }
      console.warn('SpeechRecognition error:', event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.callbacks?.onListeningChange(false);

      // In-flight Salvager: Chrome mobile frequently ends without setting isFinal=true on the last clause!
      // We salvage whatever was heard so not a single sentence or word is dropped!
      if (this.latestInterimText.trim().length > 0) {
        const toFlush = this.latestInterimText.trim();
        this.latestInterimText = '';
        this.flushSpeech(toFlush);
      }

      // Safe Auto-Recovery: Give Android AudioService 100ms to cleanly release hardware handle before restarting
      if (this.shouldKeepListening) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (this.shouldKeepListening) {
            this.safeStart();
          }
        }, 100);
      }
    };
  }

  private safeStart() {
    if (!this.shouldKeepListening) return;

    this.initRecognition(this.currentLang);

    try {
      this.recognition.start();
    } catch (err: any) {
      console.warn('Recognition start exception, scheduling retry in 250ms:', err);
      clearTimeout(this.restartTimeout);
      this.restartTimeout = setTimeout(() => {
        if (this.shouldKeepListening && !this.isListening) {
          this.safeStart();
        }
      }, 250);
    }
  }

  private startWatchdog() {
    this.stopWatchdog();
    // Heartbeat watchdog: checks every 1500ms to guarantee continuous uptime
    this.watchdogTimer = setInterval(() => {
      if (this.shouldKeepListening && !this.isListening) {
        console.log('[MoHua Audio Watchdog] Auto-recovering continuous listening session...');
        this.safeStart();
      }
    }, 1500);
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  async startContinuousListening(lang: string = 'es-MX', callbacks: RecognitionCallback) {
    this.callbacks = callbacks;
    this.currentLang = lang;
    this.shouldKeepListening = true;
    this.latestInterimText = '';

    // 1. Activate hardware AGC amplifier for soft voice capture
    await this.engageMicrophoneBoost();

    // 2. Initialize and start continuous recognition
    this.safeStart();

    // 3. Start uptime watchdog
    this.startWatchdog();
  }

  // Temporary single-session listening (Push-to-Talk "中译西")
  startPushToTalk(lang: string = 'zh-CN', callbacks: RecognitionCallback) {
    this.stopContinuousListening();
    this.callbacks = callbacks;
    this.currentLang = lang;
    this.shouldKeepListening = false;
    this.latestInterimText = '';
    this.safeStart();
  }

  stopPushToTalk(): Promise<void> {
    return new Promise((resolve) => {
      this.shouldKeepListening = false;
      this.stopWatchdog();
      clearTimeout(this.silenceFlushTimer);

      // Salvage any remaining interim words before stopping
      if (this.latestInterimText.trim().length > 0) {
        const toFlush = this.latestInterimText.trim();
        this.latestInterimText = '';
        this.flushSpeech(toFlush);
      }

      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (e) {
          // ignore
        }
      }
      setTimeout(resolve, 150);
    });
  }

  stopContinuousListening() {
    this.shouldKeepListening = false;
    this.stopWatchdog();
    clearTimeout(this.restartTimeout);
    clearTimeout(this.silenceFlushTimer);

    // Salvage any in-flight words before stopping
    if (this.latestInterimText.trim().length > 0) {
      const toFlush = this.latestInterimText.trim();
      this.latestInterimText = '';
      this.flushSpeech(toFlush);
    }

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (err) {
        // ignore
      }
    }

    this.releaseMicrophoneBoost();
    this.isListening = false;
    this.callbacks?.onListeningChange(false);
  }

  getListening(): boolean {
    return this.isListening;
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
