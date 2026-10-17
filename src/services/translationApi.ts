// Translation API Client
// Calls Cloudflare Pages Function `/api/translate` and `/api/models` and `/api/test-key`

import type { ModelOption } from '../types';
import { apiKeyService } from './apiKeyService';

export interface TranslateResult {
  translation: string;
  provider?: string;
  modelUsed?: string;
  durationMs: number;
}

export interface TestKeyResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

export async function fetchAvailableModels(): Promise<ModelOption[]> {
  try {
    const res = await fetch('/api/models');
    if (!res.ok) throw new Error('Models fetch failed');
    const data = await res.json();
    return data.models || [];
  } catch (err) {
    console.warn('Using default models configuration:', err);
    return [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash (推荐)',
        tier: 'free',
        provider: 'google',
        latency: '~200ms',
        available: true,
        description: '响应极快，语义自然，免费额度充裕',
      },
      {
        id: 'groq-llama-3',
        name: 'Groq Llama-3.3 70B',
        tier: 'free',
        provider: 'groq',
        latency: '~150ms',
        available: true,
        description: '超强推演速度，端到端延迟低至150ms',
      },
      {
        id: 'gpt-4o-mini',
        name: 'OpenAI GPT-4o-mini',
        tier: 'pro',
        provider: 'openai',
        latency: '~350ms',
        available: true,
        description: '顶级拉美与墨西哥俚语理解，语义极其地道',
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        tier: 'pro',
        provider: 'google',
        latency: '~450ms',
        available: true,
        description: '高复杂度长句、商务、学术同传精翻',
      },
    ];
  }
}

export async function testApiKey(
  provider: 'gemini' | 'groq' | 'openai',
  apiKey: string
): Promise<TestKeyResult> {
  try {
    const res = await fetch('/api/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, error: err.message || '网络连接失败' };
  }
}

export async function translateText(
  text: string,
  sourceLang: 'es-MX' | 'zh-CN',
  targetLang: 'zh-CN' | 'es-MX',
  modelId: string,
  modelTier: 'free' | 'pro'
): Promise<TranslateResult> {
  const startTime = Date.now();
  const customKeys = apiKeyService.getKeys();

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sourceLang,
        targetLang,
        modelId,
        modelTier,
        customKeys,
      }),
    });

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      if (errorJson?.needConfig) {
        throw new Error(errorJson.error || '未配置 API Key，请点击右上角齿轮⚙️填写 Key');
      }
      throw new Error(errorJson?.error || `翻译失败 HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      translation: data.translation,
      provider: data.provider,
      modelUsed: data.modelUsed,
      durationMs,
    };
  } catch (err: any) {
    console.error('Translation error:', err);
    throw err;
  }
}
