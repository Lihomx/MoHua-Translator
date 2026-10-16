# 🎙️ MoHua 墨华同传 (MoHua-Translator)

> **极速网页端同声传译翻译器** —— 专为手机移动端（全面兼容苹果 iOS Safari 与安卓 Chrome）打造，打开默认**墨西哥西班牙语（es-MX）同传至中文（zh-CN）**，支持 0 缓冲极速启听、反向中译西双通道对讲、以及免费与高级付费模型自由切换。

---

## 🌟 核心特色

1. **📱 专为手机端优化（iOS & Android 双端适配）**
   - **一触即启**：符合苹果 iOS Safari 与安卓浏览器安全策略，首屏轻触一次即刻激活麦克风与 AudioContext。
   - **防锁屏息屏保活（Screen WakeLock）**：自动维持屏幕常亮，杜绝现场交谈时手机锁屏中断同传。
   - **iOS 安全区与全面屏触控**：深度适配 iPhone 灵动岛、刘海屏及底部手势横条。

2. **⚡ 0 缓冲即时捕捉 & 墨西哥西语专项优化**
   - **实时增量拾音（Interim Stream）**：说话时屏幕即刻同步打字动效，毫秒级上屏。
   - **墨西哥俚语文化精翻**：系统深度预设墨西哥本地表达库（如 *güey, chido, órale, ahorita, no manches, chamba, lana* 等），翻译地道口语化。

3. **🔄 灵活双向交流（反向中译西）**
   - **打字中译西**：手机打字输入中文，点击发送即刻翻译成纯正墨西哥西语，并**自动向对方语音朗读**。
   - **按住说话对讲（Push-to-Talk）**：按住底部「中译西」按钮直接说中文，松开手指秒翻并在屏幕显示 + 自动西语播报。

4. **🔊 防回音双模播报**
   - 屏幕常驻「中文播报 开/关」快捷开关：
     - 佩戴耳机时：开启实时中文语音同传；
     - 扬声器外放时：一键静音看字幕，彻底杜绝外放声音被麦克风二次录入的哮叫与死循环。

5. **💎 阶梯模型切换（纯后端密钥安全托管）**
   - 手机端无需输入复杂的 API Key，密钥由 Cloudflare 云端环境变量统一托管。
   - 顶部菜单自由切换：
     - 🌟 **【免费体验档】**：Web Speech + Google Gemini 2.5 Flash / Groq Llama-3-8B（零成本、超快响应）
     - 💎 **【高级付费档】**：OpenAI GPT-4o-mini / Gemini 2.5 Pro（复杂俚语与长句深度精翻）

---

## 🚀 部署到 Cloudflare Pages（推荐，100% 免费）

本项目采用 **Cloudflare Pages + Functions** 全栈架构，前端静态资源与后端 Serverless API 融为一体，开箱自带全球 CDN 与 HTTPS。

### 第一步：推送到 GitHub
当前仓库对应：`https://github.com/Lihomx/MoHua-Translator`

### 第二步：在 Cloudflare Pages 绑定仓库
1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages** -> 点击 **Create application** -> 选择 **Pages** -> **Connect to Git**。
3. 选择你的 GitHub 仓库 `MoHua-Translator`。
4. 构建设置配置如下：
   - **Framework preset（框架预设）**：`Vite`
   - **Build command（构建命令）**：`npm run build`
   - **Build output directory（输出目录）**：`dist`
   - **Root directory（根目录）**：`/`
5. 点击 **Save and Deploy** 即可完成部署！

### 第三步：配置模型环境变量（API Keys）
在 Cloudflare Pages 项目后台中，进入 **Settings** -> **Environment Variables**，添加以下任意一个或多个密钥（均加密安全存储在后端）：

| 环境变量名 | 说明 | 获取地址 |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Google Gemini Key (推荐免费主力)** | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `GROQ_API_KEY` | **Groq API Key (超低延迟 Llama-3)** | [Groq Console](https://console.groq.com/keys) |
| `OPENAI_API_KEY` | **OpenAI Key (支持 GPT-4o-mini)** | [OpenAI Platform](https://platform.openai.com/api-keys) |

> 提示：添加完环境变量后，在 Cloudflare Pages 后台重新部署一次（Retry deployment）即可立即生效。

---

## 💻 本地运行与手机真机局域网预览

### 1. 安装依赖
```bash
npm install --legacy-peer-deps
```

### 2. 配置本地密钥（可选）
复制 `.env.example` 为 `.env`，填入你的 API Key：
```env
GEMINI_API_KEY=your_key_here
```

### 3. 启动开发服务器
```bash
npm run dev
```

终端将显示局域网访问地址（例如 `http://192.168.x.x:5173`）。
> ⚠️ **注意**：由于移动端浏览器的麦克风权限要求 **HTTPS**（`localhost` 除外），若要在手机端直接测试局域网，可通过开启 Cloudflare Tunnel 或使用自签 HTTPS 进行测试，部署至 Cloudflare Pages 后则自带原生 HTTPS。

---

## 📂 项目结构

```
MoHua-Translator/
├── functions/                     # Cloudflare Pages Functions 后端 Serverless 接口
│   ├── api/
│   │   ├── translate.ts           # 实时同传接口（墨西 Prompt 注入与多模型自动容灾路由）
│   │   └── models.ts              # 可用模型与配置检测接口
│   └── types.d.ts                 # Cloudflare Pages Functions 类型声明
├── src/
│   ├── components/                # 移动端精致 UI 组件
│   │   ├── Header.tsx             # 顶部品牌、状态、模型切换与语音播报控制
│   │   ├── StartOverlay.tsx       # 移动端“一触即启”防阻断交互卡片
│   │   ├── LiveTranscript.tsx     # 实时双语字幕流（含 interim 动态草稿上屏）
│   │   ├── TranscriptCard.tsx     # 单条双语卡片（含复制与朗读重播）
│   │   ├── BottomControls.tsx     # 底部按住说话对讲（PTT）与打字输入触发器
│   │   ├── WaveVisualizer.tsx     # 实时麦克风声波振幅动效
│   │   ├── TextInputModal.tsx     # 中文打字反向输入与西语自动外放弹窗
│   │   └── ModelSelectorModal.tsx # 免费档 vs 高级档模型选择抽屉
│   ├── services/                  # 核心服务引擎
│   │   ├── speechRecognition.ts   # 语音识别引擎（es-MX 默认，防超时自动续期）
│   │   ├── speechSynthesis.ts     # 双语语音合成引擎（原生声学音色匹配）
│   │   ├── wakeLock.ts            # 手机屏幕常亮保活服务
│   │   ├── audioVisualizer.ts     # Web Audio API 声音分析器
│   │   └── translationApi.ts      # 翻译 API 客户端
│   ├── types/                     # TypeScript 类型定义
│   ├── App.tsx                    # 主应用入口
│   ├── index.css                  # Tailwind 与移动端安全区样式
│   └── main.tsx                   # React 启动器
├── index.html                     # 移动端优化 Viewport 与 PWA 配置
├── vite.config.ts                 # Vite 构建配置与本地 Dev API 中间件
└── package.json
```

---

## 📄 授权协议

本项目采用 MIT 许可证开源。
