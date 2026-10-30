import React from 'react';
import { Volume2, VolumeX, Sparkles, Smartphone, ShieldCheck, Download, Users, Cloud, Radio, FolderKanban, Edit3 } from 'lucide-react';
import type { ModelOption, AsrEngineMode } from '../types';

interface HeaderProps {
  currentModel: ModelOption;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenModelModal: () => void;
  isWakeLockActive: boolean;
  isListening: boolean;
  asrMode: AsrEngineMode;
  onToggleAsrMode: () => void;
  onOpenFaceToFace: () => void;
  onExportSession: () => void;
  projectTitle: string;
  onOpenProjectDrawer: () => void;
  onOpenRenameModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModel,
  isMuted,
  onToggleMute,
  onOpenModelModal,
  isWakeLockActive,
  isListening,
  asrMode,
  onToggleAsrMode,
  onOpenFaceToFace,
  onExportSession,
  projectTitle,
  onOpenProjectDrawer,
  onOpenRenameModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0b0f19]/90 backdrop-blur-md border-b border-gray-800/80 px-3.5 py-2.5 pt-safe">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* Brand & Project info */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenProjectDrawer}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-sm shrink-0 hover:opacity-90 active:scale-95 transition-all"
            title="点击展开历史翻译项目"
          >
            墨
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                onClick={onOpenRenameModal}
                className="flex items-center gap-1 text-left group hover:text-emerald-300 transition-colors max-w-[130px] xs:max-w-[170px]"
                title="点击重命名当前翻译项目"
              >
                <span className="font-bold text-xs sm:text-sm tracking-tight text-white truncate group-hover:text-emerald-300">
                  {projectTitle}
                </span>
                <Edit3 className="w-2.5 h-2.5 text-gray-400 group-hover:text-emerald-400 shrink-0 opacity-70" />
              </button>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20 shrink-0">
                es-MX➔zh
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                {isListening ? '拾音中' : '已暂停'}
              </span>
              {isWakeLockActive && (
                <span className="flex items-center gap-0.5 text-blue-400 hidden xs:inline-flex">
                  <Smartphone className="w-2.5 h-2.5" />
                  常亮
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-1.5">
          {/* 1. ASR Engine Mode Toggle (Local Web Speech vs Cloud Whisper) */}
          <button
            onClick={onToggleAsrMode}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-all active:scale-95 ${
              asrMode === 'cloud-whisper'
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
            }`}
            title={asrMode === 'cloud-whisper' ? '当前：云端 Whisper 引擎（高灵敏·PDA免装引擎）。点击切换为本地引擎' : '当前：本地极速引擎。点击切换为云端 Whisper 引擎'}
          >
            {asrMode === 'cloud-whisper' ? <Cloud className="w-3 h-3 text-sky-400" /> : <Radio className="w-3 h-3 text-gray-400" />}
            <span className="hidden sm:inline">{asrMode === 'cloud-whisper' ? '云端Whisper' : '本地引擎'}</span>
          </button>

          {/* 2. Face-to-Face Dual-Screen Mode Button */}
          <button
            onClick={onOpenFaceToFace}
            className="p-1.5 rounded-full border bg-gray-900 border-gray-800 text-gray-400 hover:text-emerald-400 active:scale-95 transition-all"
            title="开启桌面平放【双屏对坐模式】（双方各看自己那一侧的大字双语）"
          >
            <Users className="w-3.5 h-3.5" />
          </button>

          {/* 3. Open Project / History Drawer Button */}
          <button
            onClick={onOpenProjectDrawer}
            className="p-1.5 rounded-full border bg-emerald-950/30 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all"
            title="历史翻译项目与新建项目"
          >
            <FolderKanban className="w-3.5 h-3.5" />
          </button>

          {/* 4. Export Session Button */}
          <button
            onClick={onExportSession}
            className="p-1.5 rounded-full border bg-gray-900 border-gray-800 text-gray-400 hover:text-emerald-400 active:scale-95 transition-all"
            title="导出当前会话双语记录 (TXT)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* 4. Model Switcher Pill */}
          <button
            onClick={onOpenModelModal}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm transition-all active:scale-95 ${
              currentModel.tier === 'pro'
                ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
            }`}
            title="点击切换同传大模型"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="max-w-[70px] truncate">{currentModel.name.split(' ')[0]}</span>
            <span className="text-[9px] opacity-70">▾</span>
          </button>

          {/* 5. Voice Output Toggle (Subtitle Mode vs Audio Readout) */}
          <button
            onClick={onToggleMute}
            className={`p-1.5 rounded-full border transition-all active:scale-95 ${
              isMuted
                ? 'bg-gray-900 border-gray-800 text-gray-400 hover:text-emerald-300'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            }`}
            title={isMuted ? '当前为【纯字幕同传】（推荐：外放麦克风互不干扰，不漏词）。点击开启中文朗读。' : '已开启【语音朗读】（建议佩戴耳机，避免外放声音干扰麦克风）。点击恢复纯字幕。'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {/* 6. Discreet Admin Portal Link */}
          <a
            href="/admin"
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-full border bg-gray-900 border-gray-800 text-gray-500 hover:text-emerald-400 hover:border-emerald-500/30 active:scale-95 transition-all"
            title="管理后台（配置/修改 API Key）"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
};
