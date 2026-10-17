import React, { useState, useEffect } from 'react';
import { X, Check, Eye, EyeOff, ExternalLink, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react';
import { apiKeyService, type CustomApiKeys } from '../services/apiKeyService';
import { testApiKey, type TestKeyResult } from '../services/translationApi';
import type { ModelOption } from '../types';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelOption[];
  currentModel: ModelOption;
  onSelectModel: (model: ModelOption) => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  models,
  currentModel,
  onSelectModel,
}) => {
  const [keys, setKeys] = useState<CustomApiKeys>({});
  const [showKey, setShowKey] = useState<{ [k: string]: boolean }>({});
  const [testResults, setTestResults] = useState<{ [k: string]: TestKeyResult | null }>({});
  const [testing, setTesting] = useState<{ [k: string]: boolean }>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeys(apiKeyService.getKeys());
      setSavedSuccess(false);
      setTestResults({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async (provider: 'gemini' | 'groq' | 'openai') => {
    setTesting((prev) => ({ ...prev, [provider]: true }));
    setTestResults((prev) => ({ ...prev, [provider]: null }));

    const key = keys[provider] || '';
    const res = await testApiKey(provider, key);

    setTesting((prev) => ({ ...prev, [provider]: false }));
    setTestResults((prev) => ({ ...prev, [provider]: res }));
  };

  const handleSave = () => {
    apiKeyService.saveKeys(keys);
    apiKeyService.setActiveModelId(currentModel.id);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    if (confirm('确认清空本地保存的所有测试 API Key 吗？')) {
      apiKeyService.clearKeys();
      setKeys({});
      setTestResults({});
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center p-0 sm:p-4">
      <div className="bg-[#111827] border-t sm:border border-gray-800 rounded-t-3xl sm:rounded-2xl p-5 pb-safe max-h-[90vh] overflow-y-auto max-w-lg w-full mx-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-gray-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              ⚙️
            </div>
            <div>
              <h3 className="text-base font-bold text-white">同传管理与 API 调试后台</h3>
              <p className="text-[11px] text-gray-400">测试自定义 Key 与模型快速切换</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cloudflare Tip Banner */}
        <div className="mb-4 p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-blue-300">本地测试专用：</span>
            在此填入的 Key 仅保存在当前浏览器的 <code>localStorage</code>，不会泄露。
            后期在 Cloudflare 后台配置好环境变量后，此处可随时留空自动走云端！
          </div>
        </div>

        {/* Section 1: Google Gemini */}
        <div className="mb-4 p-3.5 rounded-xl bg-gray-900/60 border border-gray-800">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-400">🌟 Google Gemini API Key</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                免费推荐
              </span>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-gray-400 hover:text-emerald-400 flex items-center gap-1"
            >
              获取 Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="relative flex-1">
              <input
                type={showKey['gemini'] ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={keys.gemini || ''}
                onChange={(e) => setKeys({ ...keys, gemini: e.target.value })}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowKey({ ...showKey, gemini: !showKey['gemini'] })}
                className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-300"
              >
                {showKey['gemini'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              onClick={() => handleTestKey('gemini')}
              disabled={testing['gemini']}
              className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 border border-gray-700 flex items-center gap-1 shrink-0 active:scale-95 transition-all"
            >
              {testing['gemini'] && <RefreshCw className="w-3 h-3 animate-spin" />}
              测试
            </button>
          </div>

          {testResults['gemini'] && (
            <div className={`mt-2 text-[11px] px-2 py-1 rounded flex items-center gap-1.5 ${testResults['gemini'].ok ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
              {testResults['gemini'].ok ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>连通正常！响应延迟: {testResults['gemini'].latencyMs}ms</span>
                </>
              ) : (
                <span>❌ 失败: {testResults['gemini'].error}</span>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Groq */}
        <div className="mb-4 p-3.5 rounded-xl bg-gray-900/60 border border-gray-800">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-sky-400">⚡ Groq API Key</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                免费极速
              </span>
            </div>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-gray-400 hover:text-sky-400 flex items-center gap-1"
            >
              获取 Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="relative flex-1">
              <input
                type={showKey['groq'] ? 'text' : 'password'}
                placeholder="gsk_..."
                value={keys.groq || ''}
                onChange={(e) => setKeys({ ...keys, groq: e.target.value })}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowKey({ ...showKey, groq: !showKey['groq'] })}
                className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-300"
              >
                {showKey['groq'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              onClick={() => handleTestKey('groq')}
              disabled={testing['groq']}
              className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 border border-gray-700 flex items-center gap-1 shrink-0 active:scale-95 transition-all"
            >
              {testing['groq'] && <RefreshCw className="w-3 h-3 animate-spin" />}
              测试
            </button>
          </div>

          {testResults['groq'] && (
            <div className={`mt-2 text-[11px] px-2 py-1 rounded flex items-center gap-1.5 ${testResults['groq'].ok ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
              {testResults['groq'].ok ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>连通正常！响应延迟: {testResults['groq'].latencyMs}ms</span>
                </>
              ) : (
                <span>❌ 失败: {testResults['groq'].error}</span>
              )}
            </div>
          )}
        </div>

        {/* Section 3: OpenAI */}
        <div className="mb-4 p-3.5 rounded-xl bg-gray-900/60 border border-gray-800">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-400">💎 OpenAI API Key</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                高级精翻
              </span>
            </div>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-gray-400 hover:text-amber-400 flex items-center gap-1"
            >
              获取 Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="relative flex-1">
              <input
                type={showKey['openai'] ? 'text' : 'password'}
                placeholder="sk-..."
                value={keys.openai || ''}
                onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowKey({ ...showKey, openai: !showKey['openai'] })}
                className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-300"
              >
                {showKey['openai'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              onClick={() => handleTestKey('openai')}
              disabled={testing['openai']}
              className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 border border-gray-700 flex items-center gap-1 shrink-0 active:scale-95 transition-all"
            >
              {testing['openai'] && <RefreshCw className="w-3 h-3 animate-spin" />}
              测试
            </button>
          </div>

          {testResults['openai'] && (
            <div className={`mt-2 text-[11px] px-2 py-1 rounded flex items-center gap-1.5 ${testResults['openai'].ok ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
              {testResults['openai'].ok ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>连通正常！响应延迟: {testResults['openai'].latencyMs}ms</span>
                </>
              ) : (
                <span>❌ 失败: {testResults['openai'].error}</span>
              )}
            </div>
          )}
        </div>

        {/* Section 4: 切换激活模型 */}
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-300 block mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            当前激活的同传模型
          </label>
          <div className="grid grid-cols-2 gap-2">
            {models.map((m) => {
              const isSelected = currentModel.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectModel(m)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/30'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold truncate text-white">{m.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">{m.latency}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-800/80">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-red-400 py-2"
          >
            清空本地测试 Key
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>已保存并生效！</span>
              </>
            ) : (
              <span>保存配置</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
