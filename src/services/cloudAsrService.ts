// Cloud Whisper ASR Service
// Records audio using standard browser MediaRecorder (100% compatible with Android PDAs, iOS, and PC/Mac)
// and sends audio chunks to server-side Whisper (Groq / Cloudflare Workers AI).
// Solves:
// 1. "PDA找不到Google语音引擎" (Requires 0 Google services)
// 2. "声音太小识别不到" (Captures full uncompressed audio with software gain + Whisper acoustic models)

import { transcribeAudioBlob } from './translationApi';

type CloudAsrCallbacks = {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: string) => void;
  onListeningChange: (isListening: boolean) => void;
  onVolumeChange?: (volume: number) => void;
};

class CloudAsrService {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioChunks: Blob[] = [];
  private isListening: boolean = false;
  private shouldKeepListening: boolean = false;
  private callbacks: CloudAsrCallbacks | null = null;

  // Energy & VAD state
  private vadInterval: any = null;
  private speechDetected: boolean = false;
  private silenceStartTime: number = 0;
  private speechStartTime: number = 0;
  private isProcessingChunk: boolean = false;

  async startContinuous(callbacks: CloudAsrCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.shouldKeepListening = true;
    this.audioChunks = [];

    try {
      // 1. Obtain high-gain microphone stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: false,
        },
      });

      // 2. Setup Web Audio API Analyser for VAD energy detection
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      // 3. Start recording cycle
      this.startRecordingChunk();

      this.isListening = true;
      this.callbacks.onListeningChange(true);

      // 4. Start Energy VAD loop
      this.startVadMonitor();
    } catch (err: any) {
      console.error('Cloud Asr start error:', err);
      this.shouldKeepListening = false;
      this.isListening = false;
      this.callbacks.onListeningChange(false);
      this.callbacks.onError(err.message || '麦克风权限被拒绝，无法启动云端录音');
    }
  }

  private startRecordingChunk() {
    if (!this.mediaStream || !this.shouldKeepListening) return;

    // Pick best supported MIME type
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      '',
    ];
    let selectedMime = '';
    for (const m of mimeTypes) {
      if (!m || MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    try {
      this.audioChunks = [];
      this.mediaRecorder = selectedMime
        ? new MediaRecorder(this.mediaStream, { mimeType: selectedMime })
        : new MediaRecorder(this.mediaStream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleChunkComplete();
      };

      this.mediaRecorder.start(250); // Emit data slices every 250ms
      this.speechStartTime = Date.now();
      this.speechDetected = false;
      this.silenceStartTime = 0;
    } catch (err: any) {
      console.warn('MediaRecorder start failed:', err);
    }
  }

  private async handleChunkComplete() {
    if (this.audioChunks.length === 0) {
      if (this.shouldKeepListening) {
        this.startRecordingChunk();
      }
      return;
    }

    const mime = this.mediaRecorder?.mimeType || 'audio/webm';
    const completeBlob = new Blob(this.audioChunks, { type: mime });
    this.audioChunks = [];

    // Restart recorder for next phrase immediately so zero audio is missed!
    if (this.shouldKeepListening) {
      this.startRecordingChunk();
    }

    // Only upload if meaningful audio was recorded (> 1500 bytes and > 0.4s)
    if (completeBlob.size > 1500 && this.speechDetected) {
      this.isProcessingChunk = true;
      this.callbacks?.onInterim('🎙️ 云端 Whisper 正在高灵敏解析...');
      try {
        const res = await transcribeAudioBlob(completeBlob);
        if (res.text && res.text.trim()) {
          this.callbacks?.onFinal(res.text.trim());
        }
      } catch (err: any) {
        console.warn('Transcription error:', err);
      } finally {
        this.isProcessingChunk = false;
      }
    }
  }

  private startVadMonitor() {
    if (this.vadInterval) clearInterval(this.vadInterval);

    const buffer = new Uint8Array(this.analyser?.frequencyBinCount || 128);

    this.vadInterval = setInterval(() => {
      if (!this.isListening || !this.analyser) return;

      this.analyser.getByteFrequencyData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i];
      }
      const avg = sum / buffer.length;
      const volumeLevel = Math.min(100, Math.round((avg / 255) * 100));

      this.callbacks?.onVolumeChange?.(volumeLevel);

      const now = Date.now();
      const SPEECH_ENERGY_THRESHOLD = 12; // Sensitive threshold for quiet whispers

      if (avg >= SPEECH_ENERGY_THRESHOLD) {
        // Voice active
        if (!this.speechDetected) {
          this.speechDetected = true;
          this.callbacks?.onInterim('🎙️ 正在捕捉墨西哥西语...');
        }
        this.silenceStartTime = 0;
      } else {
        // Silence / below threshold
        if (this.speechDetected) {
          if (this.silenceStartTime === 0) {
            this.silenceStartTime = now;
          } else if (now - this.silenceStartTime > 1100) {
            // Speaker has paused for > 1.1s, finalize current utterance!
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
              this.mediaRecorder.stop();
            }
          }
        }
      }

      // Hard max chunk duration (e.g. 15s) to prevent oversized payloads during continuous background noise
      if (this.speechDetected && now - this.speechStartTime > 15000) {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
        }
      }
    }, 80);
  }

  stopContinuous() {
    this.shouldKeepListening = false;
    this.isListening = false;

    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // ignore
      }
    }
    this.mediaRecorder = null;

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        // ignore
      }
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {
        // ignore
      }
      this.audioContext = null;
    }

    this.callbacks?.onListeningChange(false);
  }

  getListening(): boolean {
    return this.isListening;
  }
}

export const cloudAsrService = new CloudAsrService();
