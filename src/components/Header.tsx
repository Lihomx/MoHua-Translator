import React from 'react';
import { Volume2, VolumeX, Sparkles, Smartphone, Settings } from 'lucide-react';
import type { ModelOption } from '../types';

interface HeaderProps {
  currentModel: ModelOption;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenModelModal: () => void;
  onOpenAdminModal: () => void;
  isWakeLockActive: boolean;
  isListening: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentModel,
  isMuted,
  onToggleMute,
  onOpenModelModal,
  onOpenAdminModal,
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

        {/* Right Controls: Model Picker + Voice Mute + Admin Settings */}
        <div className="flex items-center gap-2">
          {/* Model Switcher Pill */}
          <button
            onClick={onOpenModelModal}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
              currentModel.tier === 'pro'
                ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span className="max-w-[70px] truncate">{currentModel.tier === 'pro' ? '高级' : '免费'}</span>
          </button>

          {/* Voice Output Toggle */}
          <button
            onClick={onToggleMute}
            className={`p-2 rounded-full border transition-all ${
              isMuted
                ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                : 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400 hover:bg-indigo-600/30'
            }`}
            title={isMuted ? '点击开启中文语音朗读' : '已开启语音朗读，点击静音'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Admin / API Settings Gear Button */}
          <button
            onClick={onOpenAdminModal}
            className="p-2 rounded-full border bg-gray-900 border-gray-700 text-gray-400 hover:text-emerald-400 hover:border-emerald-500/40 active:scale-95 transition-all"
            title="管理设置 / 填写测试 API Key"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
