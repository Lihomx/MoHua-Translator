// Translation & Audio API Client
// Calls Cloudflare Worker `/api/translate`, `/api/models`, `/api/test-key`, and `/api/transcribe`

import type { ModelOption } from '../types';
import { apiKeyService } from './apiKeyService';

export interface TranslateResult {
  translation: string;
  provider?: string;
  modelUsed?: string;
  durationMs: number;
  isFallback?: boolean;
  requestedModel?: string;
  fallbackReason?: string;
}

export interface TestKeyResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

export interface TranscribeResult {
  code: number;
  text: string;
  provider?: string;
  empty?: boolean;
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
        id: 'cf-llama-3.1',
        name: 'Cloudflare AI (免Key·免费)',
        tier: 'free',
        provider: 'cloudflare',
        latency: '~180ms',
        available: true,
        description: '系统原生免Key运行，打开即用，每日1万次免费',
      },
      {
        id: 'silicon-qwen-2.5',
        name: '硅基 Qwen 2.5 7B (永久免费)',
        tier: 'free',
        provider: 'siliconflow',
        latency: '~200ms',
        available: false,
        description: '阿里通义千问，西中口语俚语互译水平极高',
      },
      {
        id: 'groq-llama-3',
        name: 'Groq Llama-3.1 8B (超快)',
        tier: 'free',
        provider: 'groq',
        latency: '~100ms',
        available: false,
        description: '超强LPU推演速度，端到端延迟低至100ms',
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash (推荐)',
        tier: 'free',
        provider: 'google',
        latency: '~200ms',
        available: false,
        description: '响应极快，语义自然，免费额度充裕',
      },
      {
        id: 'sambanova-llama',
        name: 'SambaNova Llama-3.1 (极速)',
        tier: 'free',
        provider: 'sambanova',
        latency: '~100ms',
        available: false,
        description: '超算芯片级推理速度，专为同声传译设计',
      },
      {
        id: 'zhipu-glm-4',
        name: '智谱 GLM-4-Flash (免费)',
        tier: 'free',
        provider: 'zhipu',
        latency: '~250ms',
        available: false,
        description: '智谱官方0元免费调用，中文表达地道流畅',
      },
      {
        id: 'openrouter-free',
        name: 'OpenRouter Free (聚合)',
        tier: 'free',
        provider: 'openrouter',
        latency: '~300ms',
        available: false,
        description: '多路免费大模型聚合路由，高可用兜底',
      },
      {
        id: 'gpt-4o-mini',
        name: 'OpenAI GPT-4o-mini',
        tier: 'pro',
        provider: 'openai',
        latency: '~350ms',
        available: false,
        description: '顶级拉美与墨西哥俚语理解，语义极其地道',
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        tier: 'pro',
        provider: 'google',
        latency: '~450ms',
        available: false,
        description: '高复杂度长句、商务、学术同传精翻',
      },
    ];
  }
}

export async function testApiKey(
  provider: 'gemini' | 'groq' | 'openai' | 'cf-ai' | 'siliconflow' | 'zhipu' | 'sambanova' | 'openrouter',
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
  modelTier: 'free' | 'pro',
  context: Array<{ sourceText: string; translatedText: string }> = []
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
        context: context.slice(-3), // Send recent 3 turns for context-coherent translation
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
      isFallback: data.isFallback,
      requestedModel: data.requestedModel,
      fallbackReason: data.fallbackReason,
    };
  } catch (err: any) {
    console.error('Translation error:', err);
    throw err;
  }
}

/**
 * Cloud Whisper ASR API
 * Sends audio blob (recorded via standard MediaRecorder) to server-side Whisper (Groq/Cloudflare)
 * Works on 100% of devices including PDAs without Google Speech Services.
 */
export async function transcribeAudioBlob(blob: Blob): Promise<TranscribeResult> {
  const formData = new FormData();
  formData.append('file', blob, 'recording.webm');

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    throw new Error(errorJson?.error || `语音转文字失败 HTTP ${res.status}`);
  }

  const data = await res.json();
  return data;
}

/**
 * Save / Sync translation project session to Cloudflare backend
 */
export async function saveSessionToServer(sessionData: {
  id: string;
  title: string;
  customName?: string;
  clientName?: string;
  timestamp: number;
  messageCount: number;
  messages: any[];
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, error: err.message || '网络连接失败' };
  }
}

/**
 * Fetch all sessions for client drawer
 */
export async function fetchClientSessions(): Promise<any[]> {
  try {
    const res = await fetch('/api/sessions');
    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions || [];
  } catch (err) {
    return [];
  }
}

/**
 * Fetch application system settings (e.g. idle auto-pause seconds)
 */
export async function fetchAppSettings(): Promise<{ autoPauseSeconds: number }> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Settings fetch failed');
    const data = await res.json();
    return {
      autoPauseSeconds: typeof data.autoPauseSeconds === 'number' ? data.autoPauseSeconds : 300,
    };
  } catch (err) {
    return { autoPauseSeconds: 300 }; // 默认 5 分钟 (300秒)
  }
}

