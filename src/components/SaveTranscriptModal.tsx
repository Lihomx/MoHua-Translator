import React, { useState } from 'react';
import { X, BookmarkPlus, Check, Loader2 } from 'lucide-react';

interface SaveTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageCount: number;
  onSave: (title: string, clientName: string) => Promise<boolean>;
}

export const SaveTranscriptModal: React.FC<SaveTranscriptModalProps> = ({
  isOpen,
  onClose,
  messageCount,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const defaultTitle = `会话记录_${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || defaultTitle;
    const finalClient = clientName.trim() || '通用访客';

    setIsSaving(true);
    const ok = await onSave(finalTitle, finalClient);
    setIsSaving(false);

    if (ok) {
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setTitle('');
        setClientName('');
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-gray-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-gray-100">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <BookmarkPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">命名并保存到云端</h3>
              <p className="text-[11px] text-gray-400">已记录 {messageCount} 条双语对话</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {savedSuccess ? (
          <div className="py-8 text-center text-emerald-400 space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="font-bold text-sm">已成功保存并同步到管理后台！</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs text-gray-300 font-medium mb-1">
                记录标题 / 命名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={defaultTitle}
                className="w-full px-3 py-2 text-xs bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 font-medium mb-1">
                客户端 / 业务标签 (可选)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="例如：PDA-01、仓库验货、墨西哥客户谈判"
                className="w-full px-3 py-2 text-xs bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-gray-900/80 border border-gray-800/80 text-[11px] text-gray-400 leading-relaxed">
              💡 保存后，该对话记录将同时存储在您当前的手机和<b>管理员后台</b>，管理员可直接在后台随时检索、查看和导出。
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
                disabled={isSaving}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                <span>{isSaving ? '正在保存...' : '确认保存'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
