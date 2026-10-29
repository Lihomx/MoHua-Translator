// Cloudflare Worker — MoHua 墨华同传
// Handles: Admin login, API key storage (env vars), Translation API, Static Assets
// Supported Engines: Cloudflare Workers AI, SiliconFlow, Zhipu, SambaNova, OpenRouter, Gemini, Groq, OpenAI

export interface Env {
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  SILICONFLOW_API_KEY?: string;
  ZHIPU_API_KEY?: string;
  SAMBANOVA_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  AI?: any; // Cloudflare Workers AI binding
  ADMIN_USERNAME?: string;  // default: admin
  ADMIN_PASSWORD?: string;  // default: mohua2024
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
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
Translate directly into natural, fluent spoken Chinese. Output ONLY the translated Chinese text.`;

const CHINESE_TO_MEXICAN_SPANISH_PROMPT = `You are a world-class simultaneous interpreter translating Chinese into authentic contemporary Mexican Spanish (Español Mexicano).
Translate into natural, fluent Mexican Spanish. Output ONLY the translated Spanish text.`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// Admin HTML page (self-contained, no extra assets needed)
function buildAdminHTML(env: Env): string {
  const hasGemini = Boolean(env.GEMINI_API_KEY);
  const hasGroq = Boolean(env.GROQ_API_KEY);
  const hasOpenAI = Boolean(env.OPENAI_API_KEY);
  const hasSilicon = Boolean(env.SILICONFLOW_API_KEY);
  const hasZhipu = Boolean(env.ZHIPU_API_KEY);
  const hasSambaNova = Boolean(env.SAMBANOVA_API_KEY);
  const hasOpenRouter = Boolean(env.OPENROUTER_API_KEY);
  const hasCfAi = Boolean(env.AI);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>MoHua 管理后台</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro',sans-serif;background:#0b0f19;color:#f3f4f6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:#111827;border:1px solid #1f2937;border-radius:20px;padding:28px;width:100%;max-width:540px;box-shadow:0 25px 50px rgba(0,0,0,0.5)}
  .logo{display:flex;align-items:center;gap:10px;margin-bottom:24px}
  .logo-icon{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#10b981,#06b6d4);display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:16px}
  h1{font-size:18px;font-weight:700;color:#fff}
  h1 span{font-size:13px;font-weight:400;color:#6b7280;display:block;margin-top:2px}
  .section{margin-bottom:16px;background:#0d1322;border:1px solid #1f293d;border-radius:14px;padding:14px}
  .section-title{font-size:12px;font-weight:700;letter-spacing:.04em;color:#10b981;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between}
  .field{margin-bottom:6px}
  label{display:block;font-size:11px;color:#9ca3af;margin-bottom:4px}
  input{width:100%;background:#0b0f19;border:1px solid #374151;border-radius:8px;padding:8px 10px;color:#f3f4f6;font-size:12px;font-family:monospace;outline:none;transition:.2s}
  input:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.15)}
  .status{display:inline-flex;align-items:center;gap:4px;font-size:10px;padding:2px 7px;border-radius:20px;font-weight:600}
  .status.ok{background:rgba(16,185,129,.1);color:#10b981;border:1px solid rgba(16,185,129,.3)}
  .status.missing{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)}
  .status.native{background:rgba(59,130,246,.1);color:#60a5fa;border:1px solid rgba(59,130,246,.3)}
  .label-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
  .btn{width:100%;padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg,#10b981,#06b6d4);color:#fff;font-weight:700;font-size:14px;cursor:pointer;transition:.15s;margin-top:4px}
  .btn:hover{opacity:.9;transform:translateY(-1px)}
  .btn:active{transform:scale(.98)}
  .btn.secondary{background:#1f2937;border:1px solid #374151;color:#d1d5db;margin-top:8px}
  .btn.secondary:hover{background:#374151}
  .msg{padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:16px;display:none}
  .msg.ok{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);color:#10b981}
  .msg.err{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171}
  .divider{border:none;border-top:1px solid #1f2937;margin:20px 0}
  .login-wrap{display:none}
  .admin-wrap{display:none}
  .info-box{background:#0b0f19;border:1px solid #1f2937;border-radius:12px;padding:12px 14px;font-size:12px;color:#6b7280;line-height:1.6;margin-top:16px}
  .info-box strong{color:#9ca3af}
  .test-btn{float:right;background:#1f2937;border:1px solid #374151;color:#9ca3af;border-radius:6px;padding:3px 8px;font-size:10px;cursor:pointer}
  .test-btn:hover{color:#10b981;border-color:#10b981}
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <div class="logo-icon">墨</div>
    <h1>MoHua 墨华同传<span id="page-subtitle">管理后台 · 请登录</span></h1>
  </div>

  <div id="msg" class="msg"></div>

  <!-- Login Form -->
  <div class="login-wrap" id="login-wrap" style="display:block">
    <div class="section" style="background:transparent;border:none;padding:0">
      <div class="section-title">🔐 管理员登录</div>
      <div class="field">
        <label>账号</label>
        <input id="un" type="text" placeholder="admin" autocomplete="username">
      </div>
      <div class="field">
        <label>密码</label>
        <input id="pw" type="password" placeholder="••••••••" autocomplete="current-password">
      </div>
      <button class="btn" onclick="doLogin()">登录后台</button>
    </div>
    <div class="info-box">
      <strong>默认账号密码：</strong><br>
      账号：<code>admin</code> &nbsp; 密码：<code>mohua2024</code><br><br>
      <strong>提示：</strong>可在 Cloudflare 后台 Settings → Variables 中设置环境变量 <code>ADMIN_USERNAME</code> 和 <code>ADMIN_PASSWORD</code> 修改默认登录凭证。
    </div>
  </div>

  <!-- Admin Panel -->
  <div class="admin-wrap" id="admin-wrap">
    <div id="page-subtitle-2" style="font-size:11px;color:#6b7280;margin-bottom:16px">
      已登录 · 支持 8 大模型引擎 · 永久免费与自备 Key 随心调配
    </div>

    <!-- 0. Cloudflare Workers AI -->
    <div class="section">
      <div class="section-title">
        <span>🤖 Cloudflare Workers AI</span>
        <button class="test-btn" onclick="testKey('cf-ai')">测试连通</button>
      </div>
      <div class="label-row">
        <label>系统原生 Llama-3.1 8B（每日 10,000 次免费推理）</label>
        <span class="status native">${hasCfAi ? '✓ 内置已启用' : '✓ 原生就绪'}</span>
      </div>
      <p style="font-size:11px;color:#6b7280;margin-top:2px">免 Key 零配置 · 边缘节点超低延迟 ~180ms，开箱即用保底</p>
    </div>

    <!-- 1. SiliconFlow -->
    <div class="section">
      <div class="section-title">
        <span>🇨🇳 硅基流动 SiliconFlow（Qwen 2.5 永久免费）</span>
        <button class="test-btn" onclick="testKey('siliconflow')">测试连通</button>
      </div>
      <div class="field">
        <div class="label-row">
          <label>SILICONFLOW_API_KEY (推荐模型: Qwen/Qwen2.5-7B-Instruct)</label>
          <span class="status ${hasSilicon ? 'ok' : 'missing'}">${hasSilicon ? '✓ 已配置' : '○ 未配置'}</span>
        </div>
        <input id="siliconflow" type="password" placeholder="sk-..." ${hasSilicon ? 'value="[已在环境变量配置]"' : ''}>
      </div>
    </div>

    <!-- 2. Groq -->
    <div class="section">
      <div class="section-title">
        <span>⚡ Groq API Key（超极速 ~100ms）</span>
        <button class="test-btn" onclick="testKey('groq')">测试连通</button>
      </div>
      <div class="field">
        <div class="label-row">
          <label>GROQ_API_KEY (默认: llama-3.1-8b-instant)</label>
          <span class="status ${hasGroq ? 'ok' : 'missing'}">${hasGroq ? '✓ 已配置' : '○ 未配置'}</span>
        </div>
        <input id="groq" type="password" placeholder="gsk_..." ${hasGroq ? 'value="[已在环境变量配置]"' : ''}>
      </div>
    </div>

    <!-- 3. SambaNova -->
    <div class="section">
      <div class="section-title">
        <span>🚀 SambaNova Cloud（超算级极速免费）</span>
        <button class="test-btn" onclick="testKey('sambanova')">测试连通</button>
      </div>
      <div class="field">
        <div class="label-row">
          <label>SAMBANOVA_API_KEY (Meta-Llama-3.1-8B-Instruct)</label>
          <span class="status ${hasSambaNova ? 'ok' : 'missing'}">${hasSambaNova ? '✓ 已配置' : '○ 未配置'}</span>
        </div>
        <input id="sambanova" type="password" placeholder="••••••••" ${hasSambaNova ? 'value="[已在环境变量配置]"' : ''}>
      </div>
    </div>

    <!-- 4. Zhipu AI -->
    <div class="section">
      <div class="section-title">
        <span>🌟 智谱 AI（GLM-4-Flash 永久免费）</span>
        <button class="test-btn" onclick="testKey('zhipu')">测试连通</button>
      </div>
      <div class="field">
        <div class="label-row">
          <label>ZHIPU_API_KEY (模型: glm-4-flash)</label>
          <span class="status ${hasZhipu ? 'ok' : 'missing'}">${hasZhipu ? '✓ 已配置' : '○ 未配置'}</span>
        </div>
        <input id="zhipu" type="password" placeholder="••••••••" ${hasZhipu ? 'value="[已在环境变量配置]"' : ''}>
      </div>
    </div>

    <!-- 5. OpenRouter -->
    <div class="section">
      <div class="section-title">
        <span>🌐 OpenRouter（全球免费模型聚合）</span>
        <button class="test-btn" onclick="testKey('openrouter')">测试连通</button>
      </div>
      <div class="field">
        <div class="label-row">
          <label>OPENROUTER_API_KEY (llama-3.1-8b:free)</label>
          <span class="status ${hasOpenRouter ? 'ok' : 'missing'}">${hasOpenRouter ? '✓ 已配置' : '○ 未配置'}</span>
        </div>
        <input id="openrouter" type="password" placeholder="sk-or-..." ${hasOpenRouter ? 'value="[已在环境变量配置]"' : ''}>
      </div>
    </div>

    <!-- 6. Google Gemini -->
    <div class="section">
      <div class="section-title">
        <span>🌟 Google Gemini API Key</span>
        <button class="test-btn" onclick="testKey('gemini')">测试连通</button>
      </div>
      <div class="field">
        <div class="label-row">
          <label>GEMINI_API_KEY (gemini-2.5-flash / gemini-2.5-pro)</label>
          <span class="status ${hasGemini ? 'ok' : 'missing'}">${hasGemini ? '✓ 已配置' : '○ 未配置'}</span>
        </div>
        <input id="gemini" type="password" placeholder="AIzaSy..." ${hasGemini ? 'value="[已在环境变量配置]"' : ''}>
      </div>
    </div>

    <!-- 7. OpenAI -->
    <div class="section">
      <div class="section-title">
        <span>💎 OpenAI API Key</span>
        <button class="test-btn" onclick="testKey('openai')">测试连通</button>
      </div>
      <div class="field">
        <div class="label-row">
          <label>OPENAI_API_KEY (gpt-4o-mini)</label>
          <span class="status ${hasOpenAI ? 'ok' : 'missing'}">${hasOpenAI ? '✓ 已配置' : '○ 未配置'}</span>
        </div>
        <input id="openai" type="password" placeholder="sk-..." ${hasOpenAI ? 'value="[已在环境变量配置]"' : ''}>
      </div>
    </div>

    <div id="test-result" style="display:none;padding:10px 14px;border-radius:10px;font-size:12px;margin-bottom:12px"></div>

    <hr class="divider">

    <div class="section" style="background:transparent;border:none;padding:0">
      <div class="section-title">💾 保存 API Key（本地浏览器）</div>
      <p style="font-size:12px;color:#6b7280;margin-bottom:12px;line-height:1.6">
        填写下方 API Key 后点击保存，将安全存储在浏览器 localStorage 中。
        在 Cloudflare 后台设置环境变量可实现全站免填服务端托管。
      </p>
      <button class="btn" onclick="saveKeys()">💾 保存 Key 到本地浏览器</button>
      <button class="btn secondary" onclick="clearKeys()">🗑 清空本地保存的 Key</button>
    </div>

    <button class="btn secondary" onclick="logout()" style="margin-top:16px">退出登录</button>
  </div>
</div>

<script>
const TOKEN_KEY = 'mohua_admin_token';
const KEYS_KEY = 'mohua_custom_api_keys';

function showMsg(text, type='ok') {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.className = 'msg ' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function showTestResult(text, ok) {
  const el = document.getElementById('test-result');
  el.textContent = text;
  el.style.display = 'block';
  el.style.background = ok ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)';
  el.style.border = ok ? '1px solid rgba(16,185,129,.3)' : '1px solid rgba(239,68,68,.3)';
  el.style.color = ok ? '#10b981' : '#f87171';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

async function doLogin() {
  const un = document.getElementById('un').value.trim();
  const pw = document.getElementById('pw').value.trim();
  if (!un || !pw) { showMsg('请输入账号和密码', 'err'); return; }

  try {
    const res = await fetch('/admin/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: un, password: pw })
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem(TOKEN_KEY, data.token);
      document.getElementById('login-wrap').style.display = 'none';
      document.getElementById('admin-wrap').style.display = 'block';
      document.getElementById('page-subtitle').textContent = '管理后台 · 已登录';
      loadSavedKeys();
    } else {
      showMsg('账号或密码错误', 'err');
    }
  } catch(e) {
    showMsg('连接失败：' + e.message, 'err');
  }
}

function loadSavedKeys() {
  try {
    const data = JSON.parse(localStorage.getItem(KEYS_KEY) || '{}');
    if (data.gemini) document.getElementById('gemini').value = data.gemini;
    if (data.groq) document.getElementById('groq').value = data.groq;
    if (data.openai) document.getElementById('openai').value = data.openai;
    if (data.siliconflow) document.getElementById('siliconflow').value = data.siliconflow;
    if (data.sambanova) document.getElementById('sambanova').value = data.sambanova;
    if (data.zhipu) document.getElementById('zhipu').value = data.zhipu;
    if (data.openrouter) document.getElementById('openrouter').value = data.openrouter;
  } catch(e) {}
}

function saveKeys() {
  const gemini = document.getElementById('gemini')?.value.trim();
  const groq = document.getElementById('groq')?.value.trim();
  const openai = document.getElementById('openai')?.value.trim();
  const siliconflow = document.getElementById('siliconflow')?.value.trim();
  const sambanova = document.getElementById('sambanova')?.value.trim();
  const zhipu = document.getElementById('zhipu')?.value.trim();
  const openrouter = document.getElementById('openrouter')?.value.trim();

  const keys = {};
  if (gemini && gemini !== '[已在环境变量配置]') keys.gemini = gemini;
  if (groq && groq !== '[已在环境变量配置]') keys.groq = groq;
  if (openai && openai !== '[已在环境变量配置]') keys.openai = openai;
  if (siliconflow && siliconflow !== '[已在环境变量配置]') keys.siliconflow = siliconflow;
  if (sambanova && sambanova !== '[已在环境变量配置]') keys.sambanova = sambanova;
  if (zhipu && zhipu !== '[已在环境变量配置]') keys.zhipu = zhipu;
  if (openrouter && openrouter !== '[已在环境变量配置]') keys.openrouter = openrouter;

  localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
  showMsg('✅ 所有配置的 API Key 已保存！同传页面刷新后即刻生效', 'ok');
}

function clearKeys() {
  if (confirm('确认清空本地保存的所有 API Key？')) {
    localStorage.removeItem(KEYS_KEY);
    ['gemini','groq','openai','siliconflow','sambanova','zhipu','openrouter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    showMsg('已清空本地 API Key', 'ok');
  }
}

async function testKey(provider) {
  let apiKey = '';
  if (provider !== 'cf-ai') {
    const rawVal = document.getElementById(provider)?.value.trim() || '';
    const savedKeys = JSON.parse(localStorage.getItem(KEYS_KEY) || '{}');
    apiKey = (rawVal && rawVal !== '[已在环境变量配置]') ? rawVal : savedKeys[provider] || '';
  }

  showTestResult('🔄 正在测试连通性...', true);
  try {
    const token = localStorage.getItem(TOKEN_KEY) || '';
    const res = await fetch('/admin/api/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
      body: JSON.stringify({ provider, apiKey })
    });
    const data = await res.json();
    if (data.ok) {
      showTestResult('✅ ' + provider.toUpperCase() + ' 连通成功！响应延迟: ' + data.latencyMs + 'ms', true);
    } else {
      showTestResult('❌ 失败: ' + data.error, false);
    }
  } catch(e) {
    showTestResult('❌ 网络错误: ' + e.message, false);
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  document.getElementById('admin-wrap').style.display = 'none';
  document.getElementById('login-wrap').style.display = 'block';
  document.getElementById('page-subtitle').textContent = '管理后台 · 请登录';
  showMsg('已退出登录', 'ok');
}

window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    fetch('/admin/api/check', { headers: { 'X-Admin-Token': token } })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          document.getElementById('login-wrap').style.display = 'none';
          document.getElementById('admin-wrap').style.display = 'block';
          document.getElementById('page-subtitle').textContent = '管理后台 · 已登录';
          loadSavedKeys();
        }
      }).catch(() => {});
  }
});

document.getElementById('pw').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});
</script>
</body>
</html>`;
}

// Simple token generation
function makeToken(username: string, secret: string): string {
  return btoa(`${username}:${secret}:mohua-admin`);
}

// Resilient Groq caller
async function callGroq(apiKey: string, messages: any[], max_tokens = 500, temperature = 0.2): Promise<{ text: string; model: string }> {
  const models = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];
  let lastErr = "";
  for (const m of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: m, messages, temperature, max_tokens }),
      });
      if (res.ok) {
        const d: any = await res.json();
        return { text: d.choices?.[0]?.message?.content || "", model: m };
      }
      const errText = await res.text();
      lastErr = `HTTP ${res.status}: ${errText.slice(0, 150)}`;
      if (res.status === 401 || res.status === 403) throw new Error("Groq API Key 无效: " + lastErr);
    } catch (e: any) {
      if (e.message.includes("API Key 无效")) throw e;
      lastErr = e.message;
    }
  }
  throw new Error(lastErr || "Groq 所有可用模型均无法连接");
}

// Resilient Gemini caller
async function callGemini(apiKey: string, contents: any[], systemPrompt?: string, preferredModel = "gemini-2.5-flash"): Promise<{ text: string; model: string }> {
  const models = [preferredModel, "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"];
  const uniqueModels = [...new Set(models)];
  let lastErr = "";
  for (const m of uniqueModels) {
    try {
      const payload: any = { contents, generationConfig: { temperature: 0.3, maxOutputTokens: 500 } };
      if (systemPrompt) payload.system_instruction = { parts: [{ text: systemPrompt }] };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      if (res.ok) {
        const d: any = await res.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return { text, model: m };
      }
      const errText = await res.text();
      lastErr = `HTTP ${res.status}: ${errText.slice(0, 150)}`;
      if (res.status === 400 && errText.includes("API_KEY_INVALID")) throw new Error("Gemini API Key 无效: " + lastErr);
    } catch (e: any) {
      if (e.message.includes("API Key 无效")) throw e;
      lastErr = e.message;
    }
  }
  throw new Error(lastErr || "Gemini 所有模型均无法连接");
}

// Cloudflare Workers AI caller with resilient model fallback
async function callCloudflareAI(ai: any, messages: any[]): Promise<{ text: string; model: string }> {
  const models = [
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "@cf/meta/llama-3.2-3b-instruct",
    "@cf/meta/llama-3-8b-instruct",
    "@cf/meta/llama-3.2-1b-instruct",
  ];
  let lastErr = "";
  for (const m of models) {
    try {
      const res: any = await ai.run(m, { messages, max_tokens: 500, temperature: 0.2 });
      const text = typeof res === "string" ? res : (res?.response || res?.text || "");
      if (text) return { text, model: m };
    } catch (e: any) {
      lastErr = e.message;
    }
  }
  throw new Error(lastErr || "Cloudflare Workers AI 未响应");
}

// SiliconFlow caller (Qwen 2.5)
async function callSiliconFlow(apiKey: string, messages: any[], model = "Qwen/Qwen2.5-7B-Instruct"): Promise<{ text: string; model: string }> {
  const res = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 500 }),
  });
  if (!res.ok) throw new Error(`SiliconFlow HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const d: any = await res.json();
  return { text: d.choices?.[0]?.message?.content || "", model };
}

// Zhipu GLM-4-Flash caller
async function callZhipu(apiKey: string, messages: any[], model = "glm-4-flash"): Promise<{ text: string; model: string }> {
  const res = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 500 }),
  });
  if (!res.ok) throw new Error(`Zhipu HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const d: any = await res.json();
  return { text: d.choices?.[0]?.message?.content || "", model };
}

// SambaNova caller
async function callSambaNova(apiKey: string, messages: any[], model = "Meta-Llama-3.1-8B-Instruct"): Promise<{ text: string; model: string }> {
  const res = await fetch("https://api.sambanova.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 500 }),
  });
  if (!res.ok) throw new Error(`SambaNova HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const d: any = await res.json();
  return { text: d.choices?.[0]?.message?.content || "", model };
}

// OpenRouter caller
async function callOpenRouter(apiKey: string, messages: any[], model = "meta-llama/llama-3.1-8b-instruct:free"): Promise<{ text: string; model: string }> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://mohua-translator.pages.dev",
      "X-Title": "MoHua Translator",
    },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 500 }),
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const d: any = await res.json();
  return { text: d.choices?.[0]?.message?.content || "", model };
}

// Cloud Whisper ASR transcriber (Groq Whisper-large-v3-turbo with Cloudflare Workers AI Whisper fallback)
async function transcribeAudio(audioBytes: ArrayBuffer, mimeType: string, env: Env): Promise<{ text: string; provider: string }> {
  // 1. If Groq Key available, call Groq Whisper API (super-fast, ~150ms)
  if (env.GROQ_API_KEY) {
    try {
      const formData = new FormData();
      const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("wav") ? "wav" : "ogg";
      const blob = new Blob([audioBytes], { type: mimeType });
      formData.append("file", blob, `audio.${ext}`);
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("language", "es");
      formData.append("response_format", "json");

      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
        body: formData,
      });

      if (res.ok) {
        const d: any = await res.json();
        if (d.text && d.text.trim()) {
          return { text: d.text.trim(), provider: "groq-whisper" };
        }
      }
    } catch (e: any) {
      console.warn("Groq whisper transcription exception:", e);
    }
  }

  // 2. Native Cloudflare Workers AI Whisper fallback (100% free, 0 keys needed)
  if (env.AI) {
    try {
      const uint8 = new Uint8Array(audioBytes);
      const res: any = await env.AI.run("@cf/openai/whisper", {
        audio: [...uint8],
      });
      const text = res?.text || "";
      if (text.trim()) {
        return { text: text.trim(), provider: "cloudflare-whisper" };
      }
    } catch (e: any) {
      console.warn("Cloudflare Workers AI whisper exception:", e);
    }
  }

  throw new Error("语音转文字失败，当前节点未就绪或音频无法识别");
}

// Core test key runner (Shared between admin and in-app modal)
async function runKeyTest(provider: string, apiKey: string | undefined, env: Env): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const keyToTest = (apiKey && apiKey !== "[已在环境变量配置]") ? apiKey :
    provider === "gemini" ? env.GEMINI_API_KEY :
    provider === "groq" ? env.GROQ_API_KEY :
    provider === "openai" ? env.OPENAI_API_KEY :
    provider === "siliconflow" ? env.SILICONFLOW_API_KEY :
    provider === "zhipu" ? env.ZHIPU_API_KEY :
    provider === "sambanova" ? env.SAMBANOVA_API_KEY :
    provider === "openrouter" ? env.OPENROUTER_API_KEY : undefined;

  if (provider !== "cf-ai" && !keyToTest) {
    return { ok: false, error: "未检测到 API Key，请先输入 Key 或在 Cloudflare 环境变量中配置" };
  }

  const startTime = Date.now();
  try {
    if (provider === "cf-ai") {
      if (!env.AI) throw new Error("Cloudflare Workers AI 绑定未启用");
      const testModels = [
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        "@cf/meta/llama-3.2-3b-instruct",
        "@cf/meta/llama-3-8b-instruct",
      ];
      let ok = false;
      let lastErr = "";
      for (const m of testModels) {
        try {
          await env.AI.run(m, {
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
          });
          ok = true;
          break;
        } catch (e: any) {
          lastErr = e.message;
        }
      }
      if (!ok) throw new Error(lastErr || "Cloudflare Workers AI 测试失败");
    } else if (provider === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToTest}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
    } else if (provider === "groq") {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        method: "GET", headers: { Authorization: `Bearer ${keyToTest}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
    } else if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        method: "GET", headers: { Authorization: `Bearer ${keyToTest}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
    } else if (provider === "siliconflow") {
      const res = await fetch("https://api.siliconflow.cn/v1/models", {
        method: "GET", headers: { Authorization: `Bearer ${keyToTest}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
    } else if (provider === "zhipu") {
      const res = await fetch("https://open.bigmodel.cn/api/paas/v4/models", {
        method: "GET", headers: { Authorization: `Bearer ${keyToTest}` },
      });
      if (!res.ok) {
        const testRes = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${keyToTest}` },
          body: JSON.stringify({ model: "glm-4-flash", messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
        });
        if (!testRes.ok) throw new Error(`HTTP ${testRes.status}: ${(await testRes.text()).slice(0, 150)}`);
      }
    } else if (provider === "sambanova") {
      const res = await fetch("https://api.sambanova.ai/v1/models", {
        method: "GET", headers: { Authorization: `Bearer ${keyToTest}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
    } else if (provider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET", headers: { Authorization: `Bearer ${keyToTest}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
    } else {
      throw new Error("Unknown provider: " + provider);
    }
    return { ok: true, latencyMs: Date.now() - startTime };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ===== ADMIN ROUTES =====
    if (path === "/admin" || path === "/admin/") {
      return new Response(buildAdminHTML(env), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    if (path === "/admin/api/login" && request.method === "POST") {
      const body: any = await request.json().catch(() => ({}));
      const expectedUser = env.ADMIN_USERNAME || "admin";
      const expectedPass = env.ADMIN_PASSWORD || "mohua2024";
      if (body.username === expectedUser && body.password === expectedPass) {
        const token = makeToken(body.username, expectedPass);
        return json({ ok: true, token });
      }
      return json({ ok: false, error: "Invalid credentials" }, 401);
    }

    if (path === "/admin/api/check") {
      const token = request.headers.get("X-Admin-Token") || "";
      const expectedUser = env.ADMIN_USERNAME || "admin";
      const expectedPass = env.ADMIN_PASSWORD || "mohua2024";
      const expectedToken = makeToken(expectedUser, expectedPass);
      return json({ ok: token === expectedToken });
    }

    // Admin test key endpoint (Protected)
    if (path === "/admin/api/test-key" && request.method === "POST") {
      const token = request.headers.get("X-Admin-Token") || "";
      const expectedUser = env.ADMIN_USERNAME || "admin";
      const expectedPass = env.ADMIN_PASSWORD || "mohua2024";
      const expectedToken = makeToken(expectedUser, expectedPass);
      if (token !== expectedToken) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      const body: any = await request.json().catch(() => ({}));
      const result = await runKeyTest(body.provider, body.apiKey, env);
      return json(result);
    }

    // Public in-app test key endpoint
    if (path === "/api/test-key" && request.method === "POST") {
      const body: any = await request.json().catch(() => ({}));
      const result = await runKeyTest(body.provider, body.apiKey, env);
      return json(result);
    }

    // ===== TRANSLATION & AUDIO API ROUTES =====

    // 1. Audio Transcription Endpoint (Cloud Whisper ASR)
    if (path === "/api/transcribe" && request.method === "POST") {
      try {
        const contentType = request.headers.get("content-type") || "";
        let audioBytes: ArrayBuffer;
        let mimeType = "audio/webm";

        if (contentType.includes("multipart/form-data")) {
          const formData = await request.formData();
          const file = formData.get("file") as File;
          if (!file) return json({ error: "No audio file provided" }, 400);
          audioBytes = await file.arrayBuffer();
          mimeType = file.type || "audio/webm";
        } else {
          audioBytes = await request.arrayBuffer();
          mimeType = contentType || "audio/webm";
        }

        if (audioBytes.byteLength < 500) {
          return json({ text: "", empty: true });
        }

        const result = await transcribeAudio(audioBytes, mimeType, env);
        return json({ code: 0, text: result.text, provider: result.provider });
      } catch (err: any) {
        return json({ error: err.message || "Transcription failed" }, 500);
      }
    }

    // 2. Models status endpoint with dynamic key availability
    if (path === "/api/models" && request.method === "GET") {
      const hasCf = Boolean(env.AI);
      const hasSilicon = Boolean(env.SILICONFLOW_API_KEY);
      const hasGroq = Boolean(env.GROQ_API_KEY);
      const hasGemini = Boolean(env.GEMINI_API_KEY);
      const hasSamba = Boolean(env.SAMBANOVA_API_KEY);
      const hasZhipu = Boolean(env.ZHIPU_API_KEY);
      const hasOpenRouter = Boolean(env.OPENROUTER_API_KEY);
      const hasOpenAI = Boolean(env.OPENAI_API_KEY);

      return json({
        code: 0,
        configuredKeys: {
          cloudflare: hasCf,
          siliconflow: hasSilicon,
          groq: hasGroq,
          gemini: hasGemini,
          sambanova: hasSamba,
          zhipu: hasZhipu,
          openrouter: hasOpenRouter,
          openai: hasOpenAI,
        },
        models: [
          { id: "cf-llama-3.1", name: "Cloudflare AI (免Key·免费)", tier: "free", provider: "cloudflare", latency: "~180ms", available: hasCf, description: "系统原生免Key运行，打开即用，每日1万次免费" },
          { id: "silicon-qwen-2.5", name: "硅基 Qwen 2.5 7B (永久免费)", tier: "free", provider: "siliconflow", latency: "~200ms", available: hasSilicon, description: "阿里通义千问，西中口语俚语互译水平极高" },
          { id: "groq-llama-3", name: "Groq Llama-3.1 8B (超快)", tier: "free", provider: "groq", latency: "~100ms", available: hasGroq, description: "超强LPU推演速度，端到端延迟低至100ms" },
          { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (推荐)", tier: "free", provider: "google", latency: "~200ms", available: hasGemini, description: "响应极快，语义自然，免费额度充裕" },
          { id: "sambanova-llama", name: "SambaNova Llama-3.1 (极速)", tier: "free", provider: "sambanova", latency: "~100ms", available: hasSamba, description: "超算芯片级推理速度，专为同声传译设计" },
          { id: "zhipu-glm-4", name: "智谱 GLM-4-Flash (免费)", tier: "free", provider: "zhipu", latency: "~250ms", available: hasZhipu, description: "智谱官方0元免费调用，中文表达地道流畅" },
          { id: "openrouter-free", name: "OpenRouter Free (聚合)", tier: "free", provider: "openrouter", latency: "~300ms", available: hasOpenRouter, description: "多路免费大模型聚合路由，高可用兜底" },
          { id: "gpt-4o-mini", name: "OpenAI GPT-4o-mini", tier: "pro", provider: "openai", latency: "~350ms", available: hasOpenAI, description: "顶级拉美与墨西哥俚语理解，语义极其地道" },
          { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", tier: "pro", provider: "google", latency: "~450ms", available: hasGemini, description: "高复杂度长句、商务、学术同传精翻" },
        ],
      });
    }

    // 3. Translation endpoint with context-awareness and fallback transparency
    if (path === "/api/translate" && request.method === "POST") {
      let body: any;
      try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

      const { text, sourceLang = "es-MX", targetLang = "zh-CN", modelId = "cf-llama-3.1", customKeys = {}, context = [] } = body;
      if (!text?.trim()) return json({ translation: "" });

      const isEsToZh = sourceLang.includes("es") || targetLang.includes("zh");
      const systemPrompt = isEsToZh ? MEXICAN_SPANISH_TO_CHINESE_PROMPT : CHINESE_TO_MEXICAN_SPANISH_PROMPT;

      const geminiKey = (customKeys.gemini && customKeys.gemini !== "[已在环境变量配置]") ? customKeys.gemini : env.GEMINI_API_KEY;
      const groqKey = (customKeys.groq && customKeys.groq !== "[已在环境变量配置]") ? customKeys.groq : env.GROQ_API_KEY;
      const openAiKey = (customKeys.openai && customKeys.openai !== "[已在环境变量配置]") ? customKeys.openai : env.OPENAI_API_KEY;
      const siliconKey = (customKeys.siliconflow && customKeys.siliconflow !== "[已在环境变量配置]") ? customKeys.siliconflow : env.SILICONFLOW_API_KEY;
      const zhipuKey = (customKeys.zhipu && customKeys.zhipu !== "[已在环境变量配置]") ? customKeys.zhipu : env.ZHIPU_API_KEY;
      const sambaKey = (customKeys.sambanova && customKeys.sambanova !== "[已在环境变量配置]") ? customKeys.sambanova : env.SAMBANOVA_API_KEY;
      const openrouterKey = (customKeys.openrouter && customKeys.openrouter !== "[已在环境变量配置]") ? customKeys.openrouter : env.OPENROUTER_API_KEY;

      // Construct context-aware prompt if previous turns exist
      let userContent = text;
      if (Array.isArray(context) && context.length > 0) {
        const historyText = context.slice(-3).map((c: any) => `[前序对话]:\n原文: ${c.sourceText}\n译文: ${c.translatedText}`).join("\n\n");
        userContent = `${historyText}\n\n[请结合上述上下文，翻译最新句子，保持人称代词和语境连贯，仅输出最终译文]:\n${text}`;
      }

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ];

      // Route priority
      let provider = "";
      let isFallback = false;
      let fallbackReason = "";

      if (modelId.startsWith("cf") && env.AI) {
        provider = "cloudflare";
      } else if (modelId.startsWith("silicon") && siliconKey) {
        provider = "siliconflow";
      } else if (modelId.startsWith("zhipu") && zhipuKey) {
        provider = "zhipu";
      } else if (modelId.startsWith("sambanova") && sambaKey) {
        provider = "sambanova";
      } else if (modelId.startsWith("openrouter") && openrouterKey) {
        provider = "openrouter";
      } else if (modelId.startsWith("groq") && groqKey) {
        provider = "groq";
      } else if (modelId.startsWith("gpt") && openAiKey) {
        provider = "openai";
      } else if (modelId.includes("gemini") && geminiKey) {
        provider = "gemini";
      } else {
        // Fallback chain
        isFallback = true;
        if (env.AI) {
          provider = "cloudflare";
          fallbackReason = `所选模型 [${modelId}] 当前未配置 Key，已自动由 Cloudflare Workers AI 极速兜底`;
        } else if (geminiKey) {
          provider = "gemini";
          fallbackReason = `所选模型 [${modelId}] 当前未配置 Key，已由 Google Gemini 兜底`;
        } else if (groqKey) {
          provider = "groq";
          fallbackReason = `所选模型 [${modelId}] 当前未配置 Key，已由 Groq 兜底`;
        } else if (siliconKey) {
          provider = "siliconflow";
          fallbackReason = `所选模型 [${modelId}] 当前未配置 Key，已由硅基流动兜底`;
        }
      }

      try {
        let translation = "";
        let usedModel = modelId;

        if (provider === "cloudflare" && env.AI) {
          const res = await callCloudflareAI(env.AI, messages);
          translation = res.text;
          usedModel = res.model;
        } else if (provider === "siliconflow" && siliconKey) {
          const res = await callSiliconFlow(siliconKey, messages);
          translation = res.text;
          usedModel = res.model;
        } else if (provider === "groq" && groqKey) {
          const res = await callGroq(groqKey, messages);
          translation = res.text;
          usedModel = res.model;
        } else if (provider === "sambanova" && sambaKey) {
          const res = await callSambaNova(sambaKey, messages);
          translation = res.text;
          usedModel = res.model;
        } else if (provider === "zhipu" && zhipuKey) {
          const res = await callZhipu(zhipuKey, messages);
          translation = res.text;
          usedModel = res.model;
        } else if (provider === "openrouter" && openrouterKey) {
          const res = await callOpenRouter(openrouterKey, messages);
          translation = res.text;
          usedModel = res.model;
        } else if (provider === "openai" && openAiKey) {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
            body: JSON.stringify({ model: "gpt-4o-mini", messages, temperature: 0.2, max_tokens: 500 })
          });
          const d: any = await res.json();
          translation = d.choices?.[0]?.message?.content || "";
        } else if (geminiKey) {
          const res = await callGemini(
            geminiKey,
            [{ role: "user", parts: [{ text: userContent }] }],
            systemPrompt,
            modelId.includes("pro") ? "gemini-2.5-pro" : "gemini-2.5-flash"
          );
          translation = res.text;
          usedModel = res.model;
        } else {
          return json({ error: "未检测到可用的 API Key。请访问 /admin 后台配置 Key 或开启 Cloudflare Workers AI", needConfig: true }, 503);
        }

        return json({
          code: 0,
          translation: translation.trim(),
          provider,
          modelUsed: usedModel,
          isFallback,
          requestedModel: modelId,
          fallbackReason,
        });
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // Static Assets (React Frontend)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
