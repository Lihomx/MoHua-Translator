// Cloudflare Worker — MoHua 墨华同传
// Handles: Admin login, API key storage (env vars), Translation API, Static Assets

export interface Env {
  // These are set in Cloudflare dashboard Settings > Variables & Secrets
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  // Admin panel login credentials (set in Cloudflare dashboard)
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
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>MoHua 管理后台</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro',sans-serif;background:#0b0f19;color:#f3f4f6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:#111827;border:1px solid #1f2937;border-radius:20px;padding:28px;width:100%;max-width:480px;box-shadow:0 25px 50px rgba(0,0,0,0.5)}
  .logo{display:flex;align-items:center;gap:10px;margin-bottom:24px}
  .logo-icon{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#10b981,#06b6d4);display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:16px}
  h1{font-size:18px;font-weight:700;color:#fff}
  h1 span{font-size:13px;font-weight:400;color:#6b7280;display:block;margin-top:2px}
  .section{margin-bottom:20px}
  .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#10b981;margin-bottom:10px;display:flex;align-items:center;gap:6px}
  .field{margin-bottom:12px}
  label{display:block;font-size:12px;color:#9ca3af;margin-bottom:5px}
  input{width:100%;background:#0b0f19;border:1px solid #374151;border-radius:10px;padding:10px 12px;color:#f3f4f6;font-size:13px;font-family:monospace;outline:none;transition:.2s}
  input:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.15)}
  .status{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600}
  .status.ok{background:rgba(16,185,129,.1);color:#10b981;border:1px solid rgba(16,185,129,.3)}
  .status.missing{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)}
  .label-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
  .btn{width:100%;padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg,#10b981,#06b6d4);color:#fff;font-weight:700;font-size:14px;cursor:pointer;transition:.15s;margin-top:4px}
  .btn:hover{opacity:.9;transform:translateY(-1px)}
  .btn:active{transform:scale(.98)}
  .btn.secondary{background:#1f2937;border:1px solid #374151;color:#d1d5db;margin-top:8px}
  .btn.secondary:hover{background:#374151}
  .btn.danger{background:linear-gradient(135deg,#ef4444,#dc2626);margin-top:8px}
  .msg{padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:16px;display:none}
  .msg.ok{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);color:#10b981}
  .msg.err{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171}
  .divider{border:none;border-top:1px solid #1f2937;margin:20px 0}
  .login-wrap{display:none}
  .admin-wrap{display:none}
  .info-box{background:#0b0f19;border:1px solid #1f2937;border-radius:12px;padding:12px 14px;font-size:12px;color:#6b7280;line-height:1.6;margin-top:16px}
  .info-box strong{color:#9ca3af}
  .test-btn{float:right;background:#1f2937;border:1px solid #374151;color:#9ca3af;border-radius:8px;padding:4px 10px;font-size:11px;cursor:pointer}
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
    <div class="section">
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
    <div id="page-subtitle-2" style="font-size:11px;color:#6b7280;margin-bottom:20px">
      已登录 · API Key 保存在 Cloudflare 环境变量中（安全加密）
    </div>

    <div class="section">
      <div class="section-title">🌟 Google Gemini API Key</div>
      <div class="field">
        <div class="label-row">
          <label>GEMINI_API_KEY</label>
          <span class="status ${hasGemini ? 'ok' : 'missing'}">${hasGemini ? '✓ 已配置' : '○ 未配置'}</span>
        </div>
        <input id="gemini" type="password" placeholder="AIzaSy..." ${hasGemini ? 'value="[已在环境变量配置]"' : ''}>
        <button class="test-btn" onclick="testKey('gemini')">测试连通</button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">⚡ Groq API Key</div>
      <div class="field">
        <div class="label-row">
          <label>GROQ_API_KEY (默认: llama-3.1-8b-instant，延迟 ~100ms)</label>
          <span class="status ${hasGroq ? 'ok' : 'missing'}">${hasGroq ? '✓ 已配置' : '○ 未配置'}</span>
        </div>
        <input id="groq" type="password" placeholder="gsk_..." ${hasGroq ? 'value="[已在环境变量配置]"' : ''}>
        <button class="test-btn" onclick="testKey('groq')">测试连通</button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">💎 OpenAI API Key</div>
      <div class="field">
        <div class="label-row">
          <label>OPENAI_API_KEY</label>
          <span class="status ${hasOpenAI ? 'ok' : 'missing'}">${hasOpenAI ? '✓ 已配置' : '○ 未配置'}</span>
        </div>
        <input id="openai" type="password" placeholder="sk-..." ${hasOpenAI ? 'value="[已在环境变量配置]"' : ''}>
        <button class="test-btn" onclick="testKey('openai')">测试连通</button>
      </div>
    </div>

    <div id="test-result" style="display:none;padding:10px 14px;border-radius:10px;font-size:12px;margin-bottom:12px"></div>

    <hr class="divider">

    <div class="section">
      <div class="section-title">💾 保存 API Key（本地浏览器）</div>
      <p style="font-size:12px;color:#6b7280;margin-bottom:12px;line-height:1.6">
        填写下方 API Key 后点击保存，将安全存储在浏览器 localStorage 中，翻译请求会自动带上此 Key。
        正式上线时请在 Cloudflare 后台设置环境变量实现服务端托管。
      </p>
      <button class="btn" onclick="saveKeys()">💾 保存 Key 到本地浏览器</button>
      <button class="btn secondary" onclick="clearKeys()">🗑 清空本地保存的 Key</button>
    </div>

    <hr class="divider">

    <div class="info-box">
      <strong>如何在 Cloudflare 后台永久配置 API Key（推荐）：</strong><br>
      1. 进入 Cloudflare 控制台 → Workers & Pages → mohua-translator<br>
      2. 点击 Settings → Variables and Secrets → Add variable<br>
      3. 添加 GEMINI_API_KEY / GROQ_API_KEY / OPENAI_API_KEY<br>
      4. 配置好后无需前端输入，所有用户共享后端密钥
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
  setTimeout(() => { el.style.display = 'none'; }, 5000);
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
  } catch(e) {}
}

function saveKeys() {
  const gemini = document.getElementById('gemini').value.trim();
  const groq = document.getElementById('groq').value.trim();
  const openai = document.getElementById('openai').value.trim();

  const keys = {};
  if (gemini && gemini !== '[已在环境变量配置]') keys.gemini = gemini;
  if (groq && groq !== '[已在环境变量配置]') keys.groq = groq;
  if (openai && openai !== '[已在环境变量配置]') keys.openai = openai;

  localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
  showMsg('✅ API Key 已保存！同传页面刷新后即刻生效', 'ok');
}

function clearKeys() {
  if (confirm('确认清空本地保存的 API Key？')) {
    localStorage.removeItem(KEYS_KEY);
    document.getElementById('gemini').value = '';
    document.getElementById('groq').value = '';
    document.getElementById('openai').value = '';
    showMsg('已清空本地 API Key', 'ok');
  }
}

async function testKey(provider) {
  const rawVal = document.getElementById(provider).value.trim();
  const savedKeys = JSON.parse(localStorage.getItem(KEYS_KEY) || '{}');
  const apiKey = (rawVal && rawVal !== '[已在环境变量配置]') ? rawVal : savedKeys[provider] || '';

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

// Auto-login if token exists
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

// Resilient Groq caller with automatic model fallback
async function callGroq(apiKey: string, messages: any[], max_tokens = 500, temperature = 0.2): Promise<{ text: string; model: string }> {
  const models = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "llama3-70b-8192",
    "llama3-8b-8192",
  ];
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
      if (res.status === 401 || res.status === 403) {
        throw new Error("Groq API Key 无效或未授权: " + lastErr);
      }
    } catch (e: any) {
      if (e.message.includes("API Key 无效")) throw e;
      lastErr = e.message;
    }
  }
  throw new Error(lastErr || "Groq 所有可用模型均无法连接");
}

// Resilient Gemini caller with automatic model fallback
async function callGemini(apiKey: string, contents: any[], systemPrompt?: string, preferredModel = "gemini-2.5-flash"): Promise<{ text: string; model: string }> {
  const models = [
    preferredModel,
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-flash",
  ];
  const uniqueModels = [...new Set(models)];
  let lastErr = "";
  for (const m of uniqueModels) {
    try {
      const payload: any = {
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
      };
      if (systemPrompt) {
        payload.system_instruction = { parts: [{ text: systemPrompt }] };
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok) {
        const d: any = await res.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return { text, model: m };
      }
      const errText = await res.text();
      lastErr = `HTTP ${res.status}: ${errText.slice(0, 150)}`;
      if (res.status === 400 && errText.includes("API_KEY_INVALID")) {
        throw new Error("Gemini API Key 无效: " + lastErr);
      }
    } catch (e: any) {
      if (e.message.includes("API Key 无效")) throw e;
      lastErr = e.message;
    }
  }
  throw new Error(lastErr || "Gemini 所有模型均无法连接");
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

    if (path === "/admin/api/test-key" && request.method === "POST") {
      const token = request.headers.get("X-Admin-Token") || "";
      const expectedUser = env.ADMIN_USERNAME || "admin";
      const expectedPass = env.ADMIN_PASSWORD || "mohua2024";
      const expectedToken = makeToken(expectedUser, expectedPass);
      if (token !== expectedToken) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      const body: any = await request.json().catch(() => ({}));
      const { provider, apiKey } = body;

      const keyToTest =
        (apiKey && apiKey !== "[已在环境变量配置]") ? apiKey :
        provider === "gemini" ? env.GEMINI_API_KEY :
        provider === "groq" ? env.GROQ_API_KEY :
        provider === "openai" ? env.OPENAI_API_KEY : undefined;

      if (!keyToTest) {
        return json({ ok: false, error: "没有找到可用的 API Key，请先输入 Key 或在 Cloudflare 环境变量中配置" });
      }

      const startTime = Date.now();
      try {
        if (provider === "gemini") {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToTest}`);
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errText.slice(0, 150)}`);
          }
        } else if (provider === "groq") {
          const res = await fetch("https://api.groq.com/openai/v1/models", {
            method: "GET",
            headers: { Authorization: `Bearer ${keyToTest}` },
          });
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errText.slice(0, 150)}`);
          }
        } else if (provider === "openai") {
          const res = await fetch("https://api.openai.com/v1/models", {
            method: "GET",
            headers: { Authorization: `Bearer ${keyToTest}` },
          });
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errText.slice(0, 150)}`);
          }
        } else {
          throw new Error("Unknown provider: " + provider);
        }
        return json({ ok: true, latencyMs: Date.now() - startTime });
      } catch (err: any) {
        return json({ ok: false, error: err.message });
      }
    }

    // ===== TRANSLATION API ROUTES =====
    if (path === "/api/models" && request.method === "GET") {
      const hasGemini = Boolean(env.GEMINI_API_KEY);
      const hasOpenAI = Boolean(env.OPENAI_API_KEY);
      const hasGroq = Boolean(env.GROQ_API_KEY);
      return json({
        code: 0,
        configuredKeys: { gemini: hasGemini, openai: hasOpenAI, groq: hasGroq },
        models: [
          { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (推荐)", tier: "free", provider: "google", latency: "~200ms", available: true, description: "响应极快，语义自然，免费额度充裕" },
          { id: "groq-llama-3", name: "Groq Llama-3.1 8B (超快)", tier: "free", provider: "groq", latency: "~100ms", available: true, description: "超强推演速度，端到端延迟低至100ms" },
          { id: "gpt-4o-mini", name: "OpenAI GPT-4o-mini", tier: "pro", provider: "openai", latency: "~350ms", available: true, description: "顶级拉美与墨西哥俚语理解，语义极其地道" },
          { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", tier: "pro", provider: "google", latency: "~450ms", available: true, description: "高复杂度长句、商务、学术同传精翻" },
        ],
      });
    }

    if (path === "/api/translate" && request.method === "POST") {
      let body: any;
      try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

      const { text, sourceLang = "es-MX", targetLang = "zh-CN", modelId = "gemini-2.5-flash", customKeys = {} } = body;
      if (!text?.trim()) return json({ translation: "" });

      const isEsToZh = sourceLang.includes("es") || targetLang.includes("zh");
      const systemPrompt = isEsToZh ? MEXICAN_SPANISH_TO_CHINESE_PROMPT : CHINESE_TO_MEXICAN_SPANISH_PROMPT;

      const geminiKey = (customKeys.gemini && customKeys.gemini !== "[已在环境变量配置]") ? customKeys.gemini : env.GEMINI_API_KEY;
      const groqKey = (customKeys.groq && customKeys.groq !== "[已在环境变量配置]") ? customKeys.groq : env.GROQ_API_KEY;
      const openAiKey = (customKeys.openai && customKeys.openai !== "[已在环境变量配置]") ? customKeys.openai : env.OPENAI_API_KEY;

      let provider = "gemini";
      if (modelId.startsWith("groq") && groqKey) provider = "groq";
      else if (modelId.startsWith("gpt") && openAiKey) provider = "openai";
      else if (geminiKey) provider = "gemini";
      else if (groqKey) provider = "groq";
      else if (openAiKey) provider = "openai";

      try {
        let translation = "";
        let usedModel = modelId;

        if (provider === "groq" && groqKey) {
          const res = await callGroq(groqKey, [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
          ]);
          translation = res.text;
          usedModel = res.model;
        } else if (provider === "openai" && openAiKey) {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
            body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }], temperature: 0.2, max_tokens: 500 })
          });
          const d: any = await res.json();
          translation = d.choices?.[0]?.message?.content || "";
        } else if (geminiKey) {
          const res = await callGemini(
            geminiKey,
            [{ role: "user", parts: [{ text }] }],
            systemPrompt,
            modelId.includes("pro") ? "gemini-2.5-pro" : "gemini-2.5-flash"
          );
          translation = res.text;
          usedModel = res.model;
        } else {
          return json({ error: "未配置 API Key。请访问 /admin 管理后台填写 API Key", needConfig: true }, 503);
        }
        return json({ code: 0, translation: translation.trim(), provider, modelUsed: usedModel });
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
