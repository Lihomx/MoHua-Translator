import React, { useState } from 'react';
import { Volume2, Copy, Check, Sparkles, AlertCircle } from 'lucide-react';
import type { TranslationMessage } from '../types';
import { speechSynthesisService } from '../services/speechSynthesis';

interface TranscriptCardProps {
  message: TranslationMessage;
}

export const TranscriptCard: React.FC<TranscriptCardProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isEsToZh = message.direction === 'es-to-zh';

  const handleCopy = () => {
    const textToCopy = `${message.sourceText}\n${message.translatedText}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayVoice = () => {
    if (isEsToZh) {
      // Play Chinese translation
      speechSynthesisService.speak(message.translatedText, 'zh-CN', true);
    } else {
      // Play Mexican Spanish translation
      speechSynthesisService.speak(message.translatedText, 'es-MX', true);
    }
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all duration-200 ${
        isEsToZh
          ? 'bg-gray-900/70 border-gray-800/90'
          : 'bg-emerald-950/20 border-emerald-500/20'
      }`}
    >
      {/* Top Meta Line */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-gray-300">
            {isEsToZh ? '🇲🇽 墨西哥西语' : '🇨🇳 我的中文发言'}
          </span>
          {message.isManualInput && (
            <span className="px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 text-[10px]">
              打字输入
            </span>
          )}
        </div>
        <span>{formattedTime}</span>
      </div>

      {/* Source Text */}
      <p className="text-gray-300 text-sm leading-relaxed mb-2 font-normal select-text">
        {message.sourceText}
      </p>

      {/* Divider */}
      <div className="border-t border-gray-800/60 my-2" />

      {/* Translation Result Area */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
          <span className="font-medium text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            {isEsToZh ? '🇨🇳 中文同传' : '🇲🇽 墨西哥西语'}
          </span>

          {message.status === 'done' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePlayVoice}
                className="p-1 rounded text-gray-400 hover:text-emerald-400 active:scale-95 transition-colors"
                title="朗读译文"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopy}
                className="p-1 rounded text-gray-400 hover:text-emerald-400 active:scale-95 transition-colors"
                title="复制双语"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Translation Content according to status */}
        {message.status === 'translating' && (
          <div className="flex items-center gap-2 text-emerald-400/80 text-sm py-1 animate-pulse">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping delay-100" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping delay-200" />
            </div>
            <span className="text-xs">AI 毫秒同传翻译中...</span>
          </div>
        )}

        {message.status === 'error' && (
          <div className="flex items-center gap-1.5 text-red-400 text-xs py-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{message.errorMessage || '翻译未完成，请重试'}</span>
          </div>
        )}

        {message.status === 'done' && (
          <p className="text-white text-base font-semibold leading-relaxed tracking-tight select-text">
            {message.translatedText}
          </p>
        )}
      </div>
    </div>
  );
};
