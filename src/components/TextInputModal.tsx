import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface TextInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export const TextInputModal: React.FC<TextInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end">
      <div className="bg-[#111827] border-t border-gray-800 rounded-t-3xl p-5 pb-safe animate-in slide-in-from-bottom duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h3 className="text-base font-bold text-white">输入中文 ➔ 译成墨西哥西语并自动朗读</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            autoFocus
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如：您好，这个产品怎么卖？能优惠点吗？"
            className="w-full rounded-2xl bg-gray-900 border border-gray-700 p-3.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              按回车或点击按钮发送，AI 将自动向对方播报西语
            </span>
            <button
              type="submit"
              disabled={!text.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>发送并播报</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
