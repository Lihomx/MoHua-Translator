// Cloudflare Worker entry point
// Compatible with Cloudflare Workers Builds + Static Assets (assets: "./dist")
// Supports both Cloudflare backend Environment Variables and Frontend Admin custom API keys

export interface Env {
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

const MEXICAN_SPANISH_TO_CHINESE_PROMPT = `You are a world-class simultaneous interpreter specializing in Mexican Spanish (Español Mexicano) to Simplified Chinese (简体中文).
The speaker is speaking authentic, contemporary Mexican Spanish. They may use common Mexican expressions, idioms, and colloquialisms, such as:
- 'güey' / 'wey' (dude, pal, 哥们/伙计)
- 'chido' (cool, awesome, 给力/帅/赞)
- 'órale' (wow, hurry up, right on, 哇/走起/行啊)
- 'ahorita' (right now / in a moment, 马上/等会儿)
- 'no manches' / 'no mames' (no way, you're kidding, 不会吧/别闹了)
- 'platicar' (to chat/talk, 聊聊/谈谈)
- 'chamba' (job/work, 活儿/工作)
- 'lana' (money, 银子/钱)
- 'padre' (cool/great, 超棒)
- '¿qué onda?' (what's up?, 怎么了/啥情况)

Task:
Translate the input Mexican Spanish directly into natural, fluent, spoken Chinese as heard in live simultaneous interpreting.
Rules:
1. Translate accurately according to the context and Mexican cultural nuance.
2. Output ONLY the translated Chinese text.
3. Do NOT add quotes, markdown formatting, explanations, or prefixes.`;

const CHINESE_TO_MEXICAN_SPANISH_PROMPT = `You are a world-class simultaneous interpreter translating Chinese into authentic contemporary Mexican Spanish (Español Mexicano).
Translate the input Chinese utterance into natural, fluent Mexican Spanish that native Mexicans comfortably use in everyday spoken conversation.
Rules:
1. Use Mexican Spanish vocabulary and phrasing where natural.
2. Output ONLY the translated Spanish text.
3. Do NOT add quotes, markdown formatting, explanations, or prefixes.`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Gemini-Key, X-Groq-Key, X-OpenAI-Key",
        },
      });
    }

    // 2. API Routes
    if (url.pathname === "/api/models" && request.method === "GET") {
      return handleModels(env);
    }

    if (url.pathname === "/api/translate" && request.method === "POST") {
      return handleTranslate(request, env);
    }

    if (url.pathname === "/api/test-key" && request.method === "POST") {
      return handleTestKey(request, env);
    }

    // 3. Static Assets fallback (Frontend SPA: HTML, CSS, JS)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};

// Handler: /api/models
function handleModels(env: Env): Response {
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
      available: true,
      description: "响应极快，语义自然，免费额度充裕",
    },
    {
      id: "groq-llama-3",
      name: "Groq Llama-3.3 70B",
      tier: "free",
      provider: "groq",
      latency: "~150ms",
      available: true,
      description: "超强推演速度，端到端延迟低至150ms",
    },
    {
      id: "gpt-4o-mini",
      name: "OpenAI GPT-4o-mini",
      tier: "pro",
      provider: "openai",
      latency: "~350ms",
      available: true,
      description: "顶级拉美与墨西哥俚语理解，语义极其地道",
    },
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      tier: "pro",
      provider: "google",
      latency: "~450ms",
      available: true,
      description: "高复杂度长句、商务、学术同传精翻",
    },
  ];

  return new Response(
    JSON.stringify({
      code: 0,
      configuredKeys: { gemini: hasGemini, openai: hasOpenAI, groq: hasGroq },
      models,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

// Handler: /api/test-key
async function handleTestKey(request: Request, env: Env): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), { status: 400 });
  }

  const { provider, apiKey } = body;
  const keyToTest = apiKey || (provider === 'gemini' ? env.GEMINI_API_KEY : provider === 'groq' ? env.GROQ_API_KEY : env.OPENAI_API_KEY);

  if (!keyToTest) {
    return new Response(
      JSON.stringify({ ok: false, error: "未检测到 API Key，请先输入密钥" }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  const startTime = Date.now();
  try {
    if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToTest}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 2 },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Google API ${res.status}: ${errText.slice(0, 150)}`);
      }
    } else if (provider === "groq") {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${keyToTest}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 2,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq API ${res.status}: ${errText.slice(0, 150)}`);
      }
    } else if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${keyToTest}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 2,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI API ${res.status}: ${errText.slice(0, 150)}`);
      }
    } else {
      throw new Error("未知 Provider: " + provider);
    }

    const latencyMs = Date.now() - startTime;
    return new Response(
      JSON.stringify({ ok: true, latencyMs }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || "测试连接失败" }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// Handler: /api/translate
async function handleTranslate(request: Request, env: Env): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const {
    text,
    sourceLang = "es-MX",
    targetLang = "zh-CN",
    modelId = "gemini-2.5-flash",
    customKeys = {},
  } = body;

  if (!text || typeof text !== "string" || text.trim() === "") {
    return new Response(JSON.stringify({ translation: "" }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const isEsToZh = sourceLang.toLowerCase().includes("es") || targetLang.toLowerCase().includes("zh");
  const systemPrompt = isEsToZh ? MEXICAN_SPANISH_TO_CHINESE_PROMPT : CHINESE_TO_MEXICAN_SPANISH_PROMPT;

  // Custom Keys from Frontend Admin Panel take precedence; fallback to Cloudflare env
  const geminiKey = customKeys.gemini || env.GEMINI_API_KEY;
  const groqKey = customKeys.groq || env.GROQ_API_KEY;
  const openAiKey = customKeys.openai || env.OPENAI_API_KEY;

  let chosenProvider = "gemini";
  if (modelId.startsWith("groq") && groqKey) {
    chosenProvider = "groq";
  } else if (modelId.startsWith("gpt") && openAiKey) {
    chosenProvider = "openai";
  } else if (geminiKey) {
    chosenProvider = "gemini";
  } else if (groqKey) {
    chosenProvider = "groq";
  } else if (openAiKey) {
    chosenProvider = "openai";
  }

  try {
    let translatedText = "";

    if (chosenProvider === "groq" && groqKey) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: modelId.includes("70b") || modelId === "groq-llama-3" ? "llama-3.3-70b-versatile" : "llama3-8b-8192",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.2,
          max_tokens: 500,
        }),
      });
      const data: any = await response.json();
      translatedText = data.choices?.[0]?.message?.content || "";
    } else if (chosenProvider === "openai" && openAiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.2,
          max_tokens: 500,
        }),
      });
      const data: any = await response.json();
      translatedText = data.choices?.[0]?.message?.content || "";
    } else if (geminiKey) {
      const modelName = modelId.includes("pro") ? "gemini-2.5-pro" : "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
        }),
      });
      const data: any = await response.json();
      translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      return new Response(
        JSON.stringify({
          error: "未配置 API Key。请在页面右上角管理设置中填写 API Key，或在 Cloudflare 环境变量中添加 GEMINI_API_KEY。",
          needConfig: true,
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        code: 0,
        translation: translatedText.trim(),
        provider: chosenProvider,
        modelUsed: modelId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Translation error", provider: chosenProvider }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}
