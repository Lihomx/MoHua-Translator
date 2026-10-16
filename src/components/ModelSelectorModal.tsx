import React from 'react';
import { X, Check, Sparkles, ShieldCheck } from 'lucide-react';
import type { ModelOption } from '../types';

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelOption[];
  currentModel: ModelOption;
  onSelectModel: (model: ModelOption) => void;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  models,
  currentModel,
  onSelectModel,
}) => {
  if (!isOpen) return null;

  const freeModels = models.filter((m) => m.tier === 'free');
  const proModels = models.filter((m) => m.tier === 'pro');

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end">
      <div className="bg-[#111827] border-t border-gray-800 rounded-t-3xl p-5 pb-safe max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              选择同传翻译模型
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              纯后端密钥托管 · 支持免费与高级模型随心切换
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free Tier Section */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              🌟 免费体验档
            </span>
            <span className="text-[11px] text-gray-400">零成本 · 毫秒级极速响应</span>
          </div>

          <div className="space-y-2">
            {freeModels.map((m) => {
              const isSelected = currentModel.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    onSelectModel(m);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950/30 border-blue-500/60 ring-1 ring-blue-500/30'
                      : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{m.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-emerald-400 font-mono">
                        {m.latency}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-400 font-bold" />}
                  </div>
                  <p className="text-xs text-gray-400">{m.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pro Tier Section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              💎 高级付费档
            </span>
            <span className="text-[11px] text-gray-400">专为拉美/墨西哥口音与高语速俚语调校</span>
          </div>

          <div className="space-y-2">
            {proModels.map((m) => {
              const isSelected = currentModel.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    onSelectModel(m);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/30'
                      : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{m.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-amber-400 font-mono">
                        {m.latency}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400 font-bold" />}
                  </div>
                  <p className="text-xs text-gray-400">{m.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info badge */}
        <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-[11px] text-gray-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            API Key 已在 Cloudflare 云端环境变量安全加密托管，手机端随时自由切换，无需输入密码。
          </span>
        </div>
      </div>
    </div>
  );
};
