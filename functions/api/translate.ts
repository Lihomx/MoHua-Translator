// Cloudflare Pages Function: /api/translate
// Handles real-time simultaneous translation with Mexican Spanish (es-MX) specialization

interface Env {
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
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
3. Do NOT add quotes, markdown formatting, explanations, or prefixes like "翻译:".`;

const CHINESE_TO_MEXICAN_SPANISH_PROMPT = `You are a world-class simultaneous interpreter translating Chinese into authentic contemporary Mexican Spanish (Español Mexicano).
Translate the input Chinese utterance into natural, fluent Mexican Spanish that native Mexicans comfortably use in everyday spoken conversation.
Rules:
1. Use Mexican Spanish vocabulary and phrasing where natural.
2. Output ONLY the translated Spanish text.
3. Do NOT add quotes, markdown formatting, explanations, or prefixes.`;

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const env = context.env || {};
  let body: any;

  try {
    body = await context.request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const { text, sourceLang = "es-MX", targetLang = "zh-CN", modelId = "gemini-2.5-flash" } = body;

  if (!text || typeof text !== "string" || text.trim() === "") {
    return new Response(JSON.stringify({ translation: "" }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const isEsToZh = sourceLang.toLowerCase().includes("es") || targetLang.toLowerCase().includes("zh");
  const systemPrompt = isEsToZh ? MEXICAN_SPANISH_TO_CHINESE_PROMPT : CHINESE_TO_MEXICAN_SPANISH_PROMPT;

  // Determine provider priority:
  // If model is Gemini or no other key, use Gemini
  // If model is Groq, use Groq
  // If model is OpenAI, use OpenAI
  // Auto-fallback if the selected provider key is missing
  const geminiKey = env.GEMINI_API_KEY;
  const groqKey = env.GROQ_API_KEY;
  const openAiKey = env.OPENAI_API_KEY;

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
      translatedText = await translateWithGroq(groqKey, text, systemPrompt, modelId);
    } else if (chosenProvider === "openai" && openAiKey) {
      translatedText = await translateWithOpenAI(openAiKey, text, systemPrompt, modelId);
    } else if (geminiKey) {
      translatedText = await translateWithGemini(geminiKey, text, systemPrompt, modelId);
    } else {
      // If no API keys are configured on backend, return mock or prompt user to configure keys in Cloudflare
      return new Response(
        JSON.stringify({
          error: "后端尚未配置 API Key。请在 Cloudflare Pages 设置环境变量 GEMINI_API_KEY 或 OPENAI_API_KEY 或 GROQ_API_KEY。",
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
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: err.message || "Translation service error",
        provider: chosenProvider,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
};

// 1. Google Gemini Provider
async function translateWithGemini(apiKey: string, text: string, systemPrompt: string, modelId: string): Promise<string> {
  const modelName = modelId.includes("pro") ? "gemini-2.5-pro" : "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 500,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data: any = await response.json();
  const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return candidate || "";
}

// 2. Groq Provider (Ultra-low latency Llama-3)
async function translateWithGroq(apiKey: string, text: string, systemPrompt: string, modelId: string): Promise<string> {
  const model = modelId.includes("70b") || modelId === "groq-llama-3" ? "llama-3.3-70b-versatile" : "llama3-8b-8192";
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.2,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorBody}`);
  }

  const data: any = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// 3. OpenAI Provider
async function translateWithOpenAI(apiKey: string, text: string, systemPrompt: string, modelId: string): Promise<string> {
  const model = modelId.includes("4o") ? "gpt-4o-mini" : "gpt-4o-mini";
  const url = "https://api.openai.com/v1/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.2,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
  }

  const data: any = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
