import React from 'react';
import { Mic, Zap, ShieldCheck, Smartphone, Keyboard, ExternalLink } from 'lucide-react';

interface StartOverlayProps {
  onStart: () => void;
  onStartTypingMode: () => void;
  error?: string | null;
}

export const StartOverlay: React.FC<StartOverlayProps> = ({ onStart, onStartTypingMode, error }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#0b0f19] flex flex-col items-center justify-between p-6 pt-safe pb-safe select-none">
      {/* Top Bar with Status and Admin Portal Link */}
      <div className="w-full flex items-center justify-between max-w-sm">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Zap className="w-3.5 h-3.5" />
          全自动实时同传
        </div>

        {/* Discreet link to /admin for manager/admin only */}
        <a
          href="/admin"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-emerald-400 transition-colors py-1 px-2 rounded-lg hover:bg-gray-900"
          title="管理员配置 API Key 后台（需要登录）"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>管理后台</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
        </a>
      </div>

      {/* Brand Title */}
      <div className="w-full text-center mt-2 max-w-sm">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          MoHua 墨华同传
        </h1>
        <p className="text-gray-400 text-sm mx-auto">
          🇲🇽 墨西哥西语 <span className="text-emerald-400 font-bold mx-1">➔</span> 🇨🇳 中文实时同传
        </p>
      </div>

      {/* Hero Action Button */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-sm">
        <div className="relative group">
          {/* Animated glow rings */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-30 blur-xl animate-pulse" />
          <div className="absolute -inset-1 rounded-full bg-emerald-500/40 animate-ping" />

          <button
            onClick={onStart}
            className="relative w-36 h-36 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex flex-col items-center justify-center text-white shadow-2xl shadow-emerald-500/50 active:scale-95 transition-transform duration-150 cursor-pointer border-2 border-emerald-300/40"
          >
            <Mic className="w-12 h-12 mb-1 drop-shadow-md animate-bounce" />
            <span className="text-sm font-bold tracking-wide">轻触即启</span>
          </button>
        </div>

        <p className="text-gray-300 text-sm font-medium mt-6 text-center">
          点击开启听筒，开始捕捉墨西哥西语
        </p>

        {/* Alternative for PDA or when voice engine is missing */}
        <button
          onClick={onStartTypingMode}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900/80 border border-gray-700/80 text-gray-300 hover:text-white hover:border-gray-600 text-xs font-medium active:scale-95 transition-all"
        >
          <Keyboard className="w-4 h-4 text-emerald-400" />
          <span>PDA / 文字打字模式直接进入</span>
        </button>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs text-center max-w-xs leading-relaxed">
            <p className="font-semibold text-red-200 mb-1">⚠️ 提示</p>
            {error}
            <div className="mt-2.5 pt-2 border-t border-red-500/20 flex justify-center">
              <button
                onClick={onStartTypingMode}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow"
              >
                直接进入（打字同传）
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Feature Badges */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-3 text-xs text-gray-400 mb-4">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-900/60 border border-gray-800">
          <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>iOS / 安卓 / PDA 兼容</span>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-900/60 border border-gray-800">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
          <span>云端密钥托管 · 免密切换</span>
        </div>
      </div>
    </div>
  );
};
