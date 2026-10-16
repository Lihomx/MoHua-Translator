import React, { useEffect, useRef } from 'react';
import { audioVisualizerService } from '../services/audioVisualizer';

interface WaveVisualizerProps {
  isListening: boolean;
}

export const WaveVisualizer: React.FC<WaveVisualizerProps> = ({ isListening }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isListening && canvasRef.current) {
      audioVisualizerService.start(canvasRef.current);
    } else {
      audioVisualizerService.stop();
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    }

    return () => {
      audioVisualizerService.stop();
    };
  }, [isListening]);

  return (
    <div className="flex items-center justify-center h-8 my-1">
      <canvas
        ref={canvasRef}
        width={180}
        height={32}
        className="opacity-90 transition-opacity"
      />
    </div>
  );
};
