import React, { useEffect, useRef } from 'react';
import type { TranslationMessage } from '../types';
import { TranscriptCard } from './TranscriptCard';
import { Trash2, Radio } from 'lucide-react';

interface LiveTranscriptProps {
  messages: TranslationMessage[];
  interimText: string;
  isListening: boolean;
  onClear: () => void;
}

export const LiveTranscript: React.FC<LiveTranscriptProps> = ({
  messages,
  interimText,
  isListening,
  onClear,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to latest transcript
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimText]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {/* Empty State / Listening Warmup */}
      {messages.length === 0 && !interimText && (
        <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500 px-4">
          <div className="w-14 h-14 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mb-3">
            <Radio className={`w-6 h-6 ${isListening ? 'text-emerald-400 animate-pulse' : 'text-gray-600'}`} />
          </div>
          <p className="text-gray-300 font-medium text-sm">
            {isListening ? '已就绪，正在高灵敏捕捉墨西哥西语...' : '听筒已暂停'}
          </p>
          <p className="text-gray-400 text-xs mt-1.5 max-w-xs leading-relaxed">
            当对方开口说西班牙语时，屏幕将以毫秒级速度实时跳出双语字幕
          </p>
          <div className="mt-4 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400/90 text-left space-y-1">
            <div>⚡ <b>硬件自动增益 (AGC)</b>：已自动放大弱音/远距轻语</div>
            <div>💡 <b>小声拾音建议</b>：轻声说话时离麦克风近一些（5~15cm），或随时点击底部【打字】模式直接输入</div>
          </div>
        </div>
      )}

      {/* Message History List */}
      {messages.map((msg) => (
        <TranscriptCard key={msg.id} message={msg} />
      ))}

      {/* Real-time Interim Live Preview (Voice Activity Real-time Display) */}
      {interimText && (
        <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 animate-pulse">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>🇲🇽 墨西哥西语 (正在实时说话...)</span>
          </div>
          <p className="text-emerald-100 text-sm leading-relaxed italic">
            "{interimText}"
          </p>
        </div>
      )}

      {/* Clear Button if history exists */}
      {messages.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-400 px-3 py-1 rounded-full bg-gray-900/60 border border-gray-800/60"
          >
            <Trash2 className="w-3 h-3" />
            清空历史记录
          </button>
        </div>
      )}

      <div ref={bottomRef} className="h-2" />
    </div>
  );
};
