import React from 'react';
import { RotateCcw, X, Mic } from 'lucide-react';
import type { TranslationMessage } from '../types';

interface FaceToFaceViewProps {
  messages: TranslationMessage[];
  interimText: string;
  isListening: boolean;
  onClose: () => void;
  onToggleListening: () => void;
}

export const FaceToFaceView: React.FC<FaceToFaceViewProps> = ({
  messages,
  interimText,
  isListening,
  onClose,
  onToggleListening,
}) => {
  // Get latest es-to-zh message and latest zh-to-es message
  const latestMessage = messages[messages.length - 1];

  const spanishText = latestMessage
    ? latestMessage.direction === 'es-to-zh'
      ? latestMessage.sourceText
      : latestMessage.translatedText
    : '';

  const chineseText = latestMessage
    ? latestMessage.direction === 'es-to-zh'
      ? latestMessage.translatedText
      : latestMessage.sourceText
    : '';

  return (
    <div className="fixed inset-0 z-50 bg-[#070b13] flex flex-col justify-between text-white select-none">
      {/* ===== TOP HALF: Counterparty (Mexican Spanish) — Inverted 180deg ===== */}
      <div className="flex-1 rotate-180 p-6 flex flex-col justify-between border-b border-gray-800/80 bg-gradient-to-b from-gray-900/60 to-transparent">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            🇲🇽 Español Mexicano (Para usted)
          </span>
          <span className="text-[11px] opacity-70">Face-to-Face Mode</span>
        </div>

        <div className="my-auto py-4">
          {interimText ? (
            <p className="text-xl md:text-2xl font-bold text-emerald-400 animate-pulse italic leading-relaxed">
              "{interimText}"
            </p>
          ) : spanishText ? (
            <p className="text-xl md:text-2xl font-bold text-white leading-relaxed">
              {spanishText}
            </p>
          ) : (
            <p className="text-gray-500 text-base italic">
              Empiece a hablar en español... (Hable hacia el micrófono)
            </p>
          )}
        </div>

        <div className="text-[11px] text-gray-500 text-center">
          Traducción simultánea en tiempo real
        </div>
      </div>

      {/* ===== CENTER CONTROL BAR ===== */}
      <div className="h-14 bg-gray-950 border-y border-gray-800 flex items-center justify-between px-6 z-10 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 border border-gray-700 text-gray-300 hover:text-white text-xs font-medium active:scale-95 transition-all"
        >
          <X className="w-3.5 h-3.5" />
          <span>退出对坐模式</span>
        </button>

        <button
          onClick={onToggleListening}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs transition-all active:scale-95 ${
            isListening
              ? 'bg-emerald-500 text-gray-950 shadow-lg shadow-emerald-500/20 animate-pulse'
              : 'bg-gray-800 text-gray-300 border border-gray-700'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{isListening ? '正在双向同传' : '已暂停'}</span>
        </button>

        <div className="flex items-center gap-1 text-[11px] text-gray-400">
          <RotateCcw className="w-3 h-3 text-emerald-400" />
          <span>桌面平放对坐</span>
        </div>
      </div>

      {/* ===== BOTTOM HALF: User (Simplified Chinese) — Normal Orientation ===== */}
      <div className="flex-1 p-6 flex flex-col justify-between bg-gradient-to-t from-gray-900/60 to-transparent">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            🇨🇳 中文翻译 (我看此面)
          </span>
          <span className="text-[11px] opacity-70">
            {latestMessage ? `${latestMessage.provider || ''} ${latestMessage.durationMs ? `${latestMessage.durationMs}ms` : ''}` : ''}
          </span>
        </div>

        <div className="my-auto py-4">
          {chineseText ? (
            <p className="text-xl md:text-2xl font-bold text-cyan-100 leading-relaxed">
              {chineseText}
            </p>
          ) : (
            <p className="text-gray-500 text-base italic">
              等待对方说话，中文译文将以大字号实时跳出...
            </p>
          )}
        </div>

        <div className="text-[11px] text-gray-500 text-center">
          手机平放在桌子中间，双方各看自己那一侧的大字字幕
        </div>
      </div>
    </div>
  );
};
