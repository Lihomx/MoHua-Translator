// Audio Visualizer Service
// Connects to Web Audio API to provide real-time audio wave visualization

class AudioVisualizerService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  async start(canvas: HTMLCanvasElement): Promise<void> {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      this.isRunning = true;
      this.draw(canvas);
    } catch (err) {
      console.warn('AudioVisualizer initialization error:', err);
    }
  }

  private draw(canvas: HTMLCanvasElement) {
    if (!this.isRunning || !this.analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      if (!this.isRunning || !this.analyser) return;

      this.animationFrameId = requestAnimationFrame(render);
      this.analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw dynamic glowing bars
      const barCount = 18;
      const barWidth = 3;
      const spacing = 5;
      const totalWidth = barCount * (barWidth + spacing) - spacing;
      const startX = (width - totalWidth) / 2;

      for (let i = 0; i < barCount; i++) {
        // Average frequencies
        const value = dataArray[i % bufferLength] || 10;
        const percent = Math.min(1, Math.max(0.12, value / 255));
        const barHeight = Math.max(4, percent * height * 0.9);

        const x = startX + i * (barWidth + spacing);
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#38bdf8'); // sky-400
        gradient.addColorStop(0.5, '#60a5fa'); // blue-400
        gradient.addColorStop(1, '#a855f7'); // purple-500

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    render();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
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
  }
}

export const audioVisualizerService = new AudioVisualizerService();
