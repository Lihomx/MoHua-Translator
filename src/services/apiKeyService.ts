// LocalStorage service for custom API keys testing and administration

export interface CustomApiKeys {
  gemini?: string;
  groq?: string;
  openai?: string;
  siliconflow?: string;
  zhipu?: string;
  sambanova?: string;
  openrouter?: string;
}

const STORAGE_KEY = 'mohua_custom_api_keys';
const ACTIVE_MODEL_KEY = 'mohua_active_model_id';

class ApiKeyService {
  getKeys(): CustomApiKeys {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  saveKeys(keys: CustomApiKeys) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    } catch (err) {
      console.warn('Failed to save API keys to localStorage:', err);
    }
  }

  clearKeys() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear keys:', err);
    }
  }

  getActiveModelId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACTIVE_MODEL_KEY);
  }

  setActiveModelId(modelId: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACTIVE_MODEL_KEY, modelId);
  }
}

export const apiKeyService = new ApiKeyService();
