import React from 'react';
import { Volume2, VolumeX, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';
import type { ModelOption } from '../types';

interface HeaderProps {
  currentModel: ModelOption;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenModelModal: () => void;
  isWakeLockActive: boolean;
  isListening: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentModel,
  isMuted,
  onToggleMute,
  onOpenModelModal,
  isWakeLockActive,
  isListening,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0b0f19]/90 backdrop-blur-md border-b border-gray-800/80 px-4 py-3 pt-safe">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* Brand & Mode */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-sm">
            墨
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white">MoHua 墨华同传</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                es-MX ➔ zh
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                {isListening ? '实时拾音中' : '拾音暂停'}
              </span>
              {isWakeLockActive && (
                <span className="flex items-center gap-0.5 text-blue-400">
                  <Smartphone className="w-3 h-3" />
                  屏幕常亮
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Controls: Model Switcher + Voice Output Toggle + Admin Portal Link */}
        <div className="flex items-center gap-2">
          {/* Prominent Model Switcher Button for ordinary users */}
          <button
            onClick={onOpenModelModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all active:scale-95 ${
              currentModel.tier === 'pro'
                ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
            }`}
            title="点击切换同传模型"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="max-w-[90px] truncate">{currentModel.name.split(' ')[0]}</span>
            <span className="text-[10px] opacity-70">▾</span>
          </button>

          {/* Voice Output Toggle (Subtitle Mode vs Audio Readout) */}
          <button
            onClick={onToggleMute}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs transition-all active:scale-95 ${
              isMuted
                ? 'bg-gray-800/90 border-gray-700 text-gray-300 hover:text-emerald-300'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            }`}
            title={isMuted ? '当前为【纯字幕同传】（推荐外放使用，拾音最灵敏且不漏词）。点击可开启中文语音朗读。' : '已开启【语音朗读】（建议佩戴耳机，避免外放声音干扰麦克风）。点击恢复纯字幕。'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-gray-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="text-[11px] font-medium hidden sm:inline">{isMuted ? '字幕模式' : '朗读模式'}</span>
          </button>

          {/* Discreet Admin Portal Link */}
          <a
            href="/admin"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-full border bg-gray-900 border-gray-800 text-gray-500 hover:text-emerald-400 hover:border-emerald-500/30 active:scale-95 transition-all"
            title="管理后台（配置/修改 API Key）"
          >
            <ShieldCheck className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
};
