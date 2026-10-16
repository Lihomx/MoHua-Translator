import React from 'react';
import { Mic, Zap, ShieldCheck, Smartphone } from 'lucide-react';

interface StartOverlayProps {
  onStart: () => void;
  error?: string | null;
}

export const StartOverlay: React.FC<StartOverlayProps> = ({ onStart, error }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#0b0f19] flex flex-col items-center justify-between p-6 pt-safe pb-safe select-none">
      {/* Top Brand Banner */}
      <div className="w-full text-center mt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
          <Zap className="w-3.5 h-3.5" />
          网页端 0 缓冲极速同传
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          MoHua 墨华同传
        </h1>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">
          🇲🇽 墨西哥西语 <span className="text-emerald-400 font-bold mx-1">➔</span> 🇨🇳 中文实时同传
        </p>
      </div>

      {/* Hero Action Button */}
      <div className="flex flex-col items-center justify-center my-auto">
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

        {error && (
          <div className="mt-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center max-w-xs">
            {error}
          </div>
        )}
      </div>

      {/* Bottom Feature Badges */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-3 text-xs text-gray-400 mb-4">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-900/60 border border-gray-800">
          <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>iOS / 安卓原生兼容</span>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-900/60 border border-gray-800">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
          <span>自动防锁屏息屏保活</span>
        </div>
      </div>
    </div>
  );
};
