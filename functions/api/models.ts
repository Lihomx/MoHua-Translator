// Cloudflare Pages Function: /api/models
// Returns available models and tier configurations based on backend environment secrets

interface Env {
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  DEEPGRAM_API_KEY?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const env = context.env || {};

  const hasGemini = Boolean(env.GEMINI_API_KEY);
  const hasOpenAI = Boolean(env.OPENAI_API_KEY);
  const hasGroq = Boolean(env.GROQ_API_KEY);

  const models = [
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash (推荐)",
      tier: "free",
      provider: "google",
      latency: "~200ms",
      available: hasGemini || (!hasGemini && !hasOpenAI && !hasGroq), // Always available as default fallback
      description: "响应极快，语义自然，免费额度充裕"
    },
    {
      id: "groq-llama-3",
      name: "Groq Llama-3.3 70B",
      tier: "free",
      provider: "groq",
      latency: "~150ms",
      available: hasGroq,
      description: "超强推演速度，端到端延迟低至150ms"
    },
    {
      id: "gpt-4o-mini",
      name: "OpenAI GPT-4o-mini",
      tier: "pro",
      provider: "openai",
      latency: "~350ms",
      available: hasOpenAI,
      description: "顶级拉美与墨西哥俚语理解，语义极其地道"
    },
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      tier: "pro",
      provider: "google",
      latency: "~450ms",
      available: hasGemini,
      description: "高复杂度长句、商务、学术同传精翻"
    }
  ];

  return new Response(
    JSON.stringify({
      code: 0,
      configuredKeys: {
        gemini: hasGemini,
        openai: hasOpenAI,
        groq: hasGroq,
      },
      models
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      }
    }
  );
};
