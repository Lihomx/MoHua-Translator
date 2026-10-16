import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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

function localDevApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'local-dev-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/models' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          const hasGemini = Boolean(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY);
          const hasOpenAI = Boolean(env.OPENAI_API_KEY || process.env.OPENAI_API_KEY);
          const hasGroq = Boolean(env.GROQ_API_KEY || process.env.GROQ_API_KEY);

          const models = [
            {
              id: 'gemini-2.5-flash',
              name: 'Gemini 2.5 Flash (推荐)',
              tier: 'free',
              provider: 'google',
              latency: '~200ms',
              available: hasGemini || (!hasGemini && !hasOpenAI && !hasGroq),
              description: '响应极快，语义自然，免费额度充裕',
            },
            {
              id: 'groq-llama-3',
              name: 'Groq Llama-3.3 70B',
              tier: 'free',
              provider: 'groq',
              latency: '~150ms',
              available: hasGroq,
              description: '超强推演速度，端到端延迟低至150ms',
            },
            {
              id: 'gpt-4o-mini',
              name: 'OpenAI GPT-4o-mini',
              tier: 'pro',
              provider: 'openai',
              latency: '~350ms',
              available: hasOpenAI,
              description: '顶级拉美与墨西哥俚语理解，语义极其地道',
            },
            {
              id: 'gemini-2.5-pro',
              name: 'Gemini 2.5 Pro',
              tier: 'pro',
              provider: 'google',
              latency: '~450ms',
              available: hasGemini,
              description: '高复杂度长句、商务、学术同传精翻',
            },
          ];

          res.end(
            JSON.stringify({
              code: 0,
              configuredKeys: { gemini: hasGemini, openai: hasOpenAI, groq: hasGroq },
              models,
            })
          );
          return;
        }

        if (req.url === '/api/translate' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const data = JSON.parse(body);
              const { text, sourceLang = 'es-MX', targetLang = 'zh-CN', modelId = 'gemini-2.5-flash' } = data;

              if (!text || text.trim() === '') {
                res.end(JSON.stringify({ translation: '' }));
                return;
              }

              const isEsToZh = sourceLang.toLowerCase().includes('es') || targetLang.toLowerCase().includes('zh');
              const systemPrompt = isEsToZh ? MEXICAN_SPANISH_TO_CHINESE_PROMPT : CHINESE_TO_MEXICAN_SPANISH_PROMPT;

              const geminiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
              const groqKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY;
              const openAiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

              let translation = '';
              let provider = 'gemini';

              if (modelId.startsWith('groq') && groqKey) {
                provider = 'groq';
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${groqKey}`,
                  },
                  body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                      { role: 'system', content: systemPrompt },
                      { role: 'user', content: text },
                    ],
                    temperature: 0.2,
                  }),
                });
                const resJson: any = await response.json();
                translation = resJson.choices?.[0]?.message?.content || '';
              } else if (modelId.startsWith('gpt') && openAiKey) {
                provider = 'openai';
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${openAiKey}`,
                  },
                  body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                      { role: 'system', content: systemPrompt },
                      { role: 'user', content: text },
                    ],
                    temperature: 0.2,
                  }),
                });
                const resJson: any = await response.json();
                translation = resJson.choices?.[0]?.message?.content || '';
              } else if (geminiKey) {
                provider = 'gemini';
                const modelName = modelId.includes('pro') ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
                const response = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      system_instruction: { parts: [{ text: systemPrompt }] },
                      contents: [{ role: 'user', parts: [{ text }] }],
                    }),
                  }
                );
                const resJson: any = await response.json();
                translation = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
              } else {
                // If keys not set during local testing, return simulated interpretation response
                translation = isEsToZh
                  ? `[本地同传演示] ${text} (请在 .env 或 Cloudflare 环境变量中填入 GEMINI_API_KEY 开启真机 AI 翻译)`
                  : `[Simulación] ${text} (Configure GEMINI_API_KEY en .env)`;
              }

              res.end(
                JSON.stringify({
                  code: 0,
                  translation: translation.trim(),
                  provider,
                  modelUsed: modelId,
                })
              );
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message || 'Local Dev API error' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      tailwindcss(),
      react(),
      localDevApiPlugin(env),
    ],
    server: {
      host: '0.0.0.0', // Support mobile devices accessing over LAN
      port: 5173,
    },
  };
});
