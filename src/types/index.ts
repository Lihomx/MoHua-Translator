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
}

export interface ModelOption {
  id: string;
  name: string;
  tier: 'free' | 'pro';
  provider: 'google' | 'groq' | 'openai';
  latency: string;
  available: boolean;
  description: string;
}

export type ListeningState = 'idle' | 'listening' | 'paused' | 'holding-to-talk';
