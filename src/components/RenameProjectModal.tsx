import React, { useState, useEffect } from 'react';
import { X, Edit3, Check } from 'lucide-react';

interface RenameProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCustomName?: string;
  defaultTimePrefix: string;
  onSave: (newCustomName: string) => void;
}

export const RenameProjectModal: React.FC<RenameProjectModalProps> = ({
  isOpen,
  onClose,
  currentCustomName = '',
  defaultTimePrefix,
  onSave,
}) => {
  const [customName, setCustomName] = useState(currentCustomName);

  useEffect(() => {
    setCustomName(currentCustomName);
  }, [currentCustomName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(customName.trim());
    onClose();
  };

  const previewTitle = customName.trim()
    ? `${defaultTimePrefix} ${customName.trim()}`
    : defaultTimePrefix;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-gray-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-gray-100">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">命名 / 修改项目名称</h3>
              <p className="text-[10px] text-gray-400">自定义名字为选填项</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs text-gray-300 font-medium mb-1">
              自定义项目名字 <span className="text-gray-500 font-normal">(选填)</span>
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="例如：墨西哥客户谈判、仓库验货..."
              className="w-full px-3 py-2 text-xs bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              autoFocus
            />
          </div>

          <div className="p-2.5 rounded-xl bg-gray-900/80 border border-gray-800/80 text-[11px] text-gray-400 space-y-1">
            <div className="text-gray-500">项目完整标题预览：</div>
            <div className="font-semibold text-emerald-400 truncate">{previewTitle}</div>
            <div className="text-[10px] text-gray-500 pt-1">
              系统自动保留开启时间，便于按时间检索与管理。
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-gray-700 bg-gray-900 text-xs text-gray-300 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>保存修改</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
