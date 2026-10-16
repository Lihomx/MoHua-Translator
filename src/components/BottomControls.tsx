import React, { useState } from 'react';
import { Mic, Keyboard, Pause, Play } from 'lucide-react';
import { WaveVisualizer } from './WaveVisualizer';

interface BottomControlsProps {
  isListening: boolean;
  onToggleListening: () => void;
  onOpenTextInput: () => void;
  onStartHoldToTalk: () => void;
  onStopHoldToTalk: () => void;
  isHoldingToTalk: boolean;
}

export const BottomControls: React.FC<BottomControlsProps> = ({
  isListening,
  onToggleListening,
  onOpenTextInput,
  onStartHoldToTalk,
  onStopHoldToTalk,
  isHoldingToTalk,
}) => {
  const [touchActive, setTouchActive] = useState(false);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setTouchActive(true);
    onStartHoldToTalk();
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setTouchActive(false);
    onStopHoldToTalk();
  };

  return (
    <div className="sticky bottom-0 z-40 bg-[#0b0f19]/95 backdrop-blur-xl border-t border-gray-800/80 px-4 pt-2 pb-safe select-none">
      {/* Real-time Wave Visualizer */}
      <WaveVisualizer isListening={isListening || isHoldingToTalk} />

      {/* Main Action Bar */}
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto pb-2">
        {/* 1. Pause/Resume Continuous Listening */}
        <button
          onClick={onToggleListening}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl border transition-all ${
            isListening
              ? 'bg-gray-900 border-gray-700 text-gray-300 active:scale-95'
              : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 active:scale-95'
          }`}
          title={isListening ? '暂停西语拾音' : '恢复西语拾音'}
        >
          {isListening ? <Pause className="w-5 h-5 mb-0.5" /> : <Play className="w-5 h-5 mb-0.5" />}
          <span className="text-[10px] font-medium">{isListening ? '暂停' : '继续'}</span>
        </button>

        {/* 2. Middle: Big "中译西" Push-to-Talk Button (Hold to Speak, Release to Translate & Speak Spanish) */}
        <div className="flex-1">
          <button
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={() => {
              if (touchActive) {
                setTouchActive(false);
                onStopHoldToTalk();
              }
            }}
            className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg transition-all duration-150 cursor-pointer ${
              touchActive || isHoldingToTalk
                ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-rose-500/40 scale-[0.98] ring-4 ring-rose-500/30'
                : 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-emerald-600/30 active:scale-[0.98]'
            }`}
          >
            <Mic className={`w-5 h-5 ${touchActive ? 'animate-bounce' : ''}`} />
            <span>{touchActive ? '正在录音... 松开即翻' : '按住说中文 ➔ 译成西语播报'}</span>
          </button>
        </div>

        {/* 3. Text Input Trigger Button (Type Chinese) */}
        <button
          onClick={onOpenTextInput}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gray-900 border border-gray-700 text-gray-300 hover:text-white active:scale-95 transition-all"
          title="手动输入中文"
        >
          <Keyboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">打字</span>
        </button>
      </div>
    </div>
  );
};
