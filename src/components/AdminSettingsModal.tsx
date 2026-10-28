import React, { useState, useEffect } from 'react';
import { X, Check, Eye, EyeOff, ExternalLink, ShieldCheck, RefreshCw, Sparkles, Cpu } from 'lucide-react';
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

type ProviderKey = 'cf-ai' | 'siliconflow' | 'groq' | 'sambanova' | 'zhipu' | 'openrouter' | 'gemini' | 'openai';

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

  const handleTestKey = async (provider: ProviderKey) => {
    setTesting((prev) => ({ ...prev, [provider]: true }));
    setTestResults((prev) => ({ ...prev, [provider]: null }));

    const key = provider === 'cf-ai' ? '' : (keys[provider as keyof CustomApiKeys] || '');
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

  const renderKeyField = (
    provider: ProviderKey,
    title: string,
    badgeText: string,
    badgeColor: string,
    placeholder: string,
    getKeyUrl?: string,
    note?: string
  ) => {
    const isCfAi = provider === 'cf-ai';
    const isTesting = testing[provider];
    const result = testResults[provider];

    return (
      <div className="mb-3.5 p-3 rounded-xl bg-gray-900/60 border border-gray-800">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white">{title}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${badgeColor}`}>
              {badgeText}
            </span>
          </div>
          {getKeyUrl && (
            <a
              href={getKeyUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-gray-400 hover:text-emerald-400 flex items-center gap-1"
            >
              获取 Key <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {note && <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">{note}</p>}

        <div className="flex items-center gap-2 mt-1">
          {!isCfAi ? (
            <div className="relative flex-1">
              <input
                type={showKey[provider] ? 'text' : 'password'}
                placeholder={placeholder}
                value={(keys[provider as keyof CustomApiKeys] as string) || ''}
                onChange={(e) => setKeys({ ...keys, [provider]: e.target.value })}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey({ ...showKey, [provider]: !showKey[provider] })}
                className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-300"
              >
                {showKey[provider] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <div className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-blue-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>系统边缘内置推理 · 免 Key 全免费调用</span>
            </div>
          )}

          <button
            onClick={() => handleTestKey(provider)}
            disabled={isTesting}
            className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 border border-gray-700 flex items-center gap-1 shrink-0 active:scale-95 transition-all"
          >
            {isTesting && <RefreshCw className="w-3 h-3 animate-spin" />}
            测试
          </button>
        </div>

        {result && (
          <div className={`mt-2 text-[11px] px-2 py-1 rounded flex items-center gap-1.5 ${result.ok ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
            {result.ok ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>连通正常！响应延迟: {result.latencyMs}ms</span>
              </>
            ) : (
              <span>❌ 失败: {result.error}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center p-0 sm:p-4">
      <div className="bg-[#111827] border-t sm:border border-gray-800 rounded-t-3xl sm:rounded-2xl p-5 pb-safe max-h-[92vh] overflow-y-auto max-w-lg w-full mx-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-gray-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              ⚙️
            </div>
            <div>
              <h3 className="text-base font-bold text-white">同传模型引擎配置后台</h3>
              <p className="text-[11px] text-gray-400">支持 8 大大模型服务商 · 免费与极速随心切换</p>
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
            <span className="font-semibold text-blue-300">本地安全存储：</span>
            填写下方 Key 点击保存将加密保存在浏览器本地。若在 Cloudflare 后台设置环境变量，全站所有用户可免 Key 直接享用服务端托管！
          </div>
        </div>

        {/* 1. Cloudflare Workers AI */}
        {renderKeyField(
          'cf-ai',
          '🤖 Cloudflare Workers AI',
          '免Key·原生免费',
          'bg-blue-500/10 text-blue-400 border-blue-500/20',
          '',
          undefined,
          '每天 10,000 次免费推理，同传延迟 ~180ms，零配置保底引擎。'
        )}

        {/* 2. SiliconFlow */}
        {renderKeyField(
          'siliconflow',
          '🇨🇳 硅基流动 SiliconFlow',
          'Qwen 2.5 永久免费',
          'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          'sk-...',
          'https://cloud.siliconflow.cn/',
          '阿里通义千问 Qwen 2.5 7B 模型永久免费调用，西中口语俚语互译水平极高。'
        )}

        {/* 3. Groq */}
        {renderKeyField(
          'groq',
          '⚡ Groq LPU',
          '超快 ~100ms',
          'bg-sky-500/10 text-sky-400 border-sky-500/20',
          'gsk_...',
          'https://console.groq.com/keys',
          '默认采用 llama-3.1-8b-instant，单字吐词速度极快，同传体验极其丝滑。'
        )}

        {/* 4. SambaNova */}
        {renderKeyField(
          'sambanova',
          '🚀 SambaNova Cloud',
          '极速免费',
          'bg-purple-500/10 text-purple-400 border-purple-500/20',
          '••••••••',
          'https://cloud.sambanova.ai/',
          '专为同传设计的超算芯片推理，每秒输出数百 Token，可作为 Groq 极速备用。'
        )}

        {/* 5. Zhipu AI */}
        {renderKeyField(
          'zhipu',
          '🌟 智谱 AI (GLM-4-Flash)',
          '永久 0 元免费',
          'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          '••••••••',
          'https://open.bigmodel.cn/',
          '官方承诺 GLM-4-Flash 永久免费，中文表达极其通顺地道。'
        )}

        {/* 6. OpenRouter */}
        {renderKeyField(
          'openrouter',
          '🌐 OpenRouter',
          '免费聚合池',
          'bg-orange-500/10 text-orange-400 border-orange-500/20',
          'sk-or-...',
          'https://openrouter.ai/keys',
          '一个 Key 聚合全球所有开源免费大模型（如 Llama-3.1:free、Gemini:free）。'
        )}

        {/* 7. Google Gemini */}
        {renderKeyField(
          'gemini',
          '🌟 Google Gemini',
          '免费推荐',
          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          'AIzaSy...',
          'https://aistudio.google.com/app/apikey',
          'Google 官方 Gemini 2.5 Flash / Pro，每日免费额度充足，长句精翻能力顶级。'
        )}

        {/* 8. OpenAI */}
        {renderKeyField(
          'openai',
          '💎 OpenAI (GPT-4o-mini)',
          '高级精翻',
          'bg-amber-500/10 text-amber-400 border-amber-500/20',
          'sk-...',
          'https://platform.openai.com/api-keys',
          '全球公认顶级语义理解与俚语本地化，适合商务与重要涉外洽谈同传。'
        )}

        {/* Section: 切换激活模型 */}
        <div className="my-4">
          <label className="text-xs font-bold text-gray-300 block mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            快速选择当前激活的同传模型
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
        <div className="flex items-center justify-between pt-3 border-t border-gray-800/80">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-red-400 py-2"
          >
            清空本地所有 Key
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
