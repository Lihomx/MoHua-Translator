export type TranslationDirection = 'es-to-zh' | 'zh-to-es';

export interface TranslationMessage {
  id: string;
  sourceText: string;
  translatedText: string;
  direction: TranslationDirection;
  timestamp: number;
  status: 'interim' | 'translating' | 'done' | 'error';
  errorMessage?: string;
  isManualInput?: boolean;
  modelUsed?: string;
  provider?: string;
  durationMs?: number;
  isFallback?: boolean;
  requestedModel?: string;
  fallbackReason?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  tier: 'free' | 'pro';
  provider: 'google' | 'groq' | 'openai' | 'cloudflare' | 'siliconflow' | 'zhipu' | 'sambanova' | 'openrouter';
  latency: string;
  available: boolean;
  description: string;
}

export type ListeningState = 'idle' | 'listening' | 'paused' | 'holding-to-talk';
export type AsrEngineMode = 'local' | 'cloud-whisper';

export interface ProjectSession {
  id: string;
  title: string;          // 显示名字，格式: "YYYY-MM-DD HH:mm" 或 "YYYY-MM-DD HH:mm 自定义名字"
  customName?: string;    // 用户自定义部分（可选）
  clientName?: string;    // 客户端/标签
  createdAt: number;      // 创建时间戳
  updatedAt: number;      // 最后更新时间戳
  messages: TranslationMessage[];
}
