# Next Chat 💬

一个基于 Next.js 16 的 AI 智能聊天应用，支持 Markdown 渲染、代码高亮和流式响应。

## 功能特性 ✨

- 💬 **实时对话** - 支持与 AI 进行流畅的对话交互
- 📝 **Markdown 渲染** - 支持丰富的 Markdown 语法，包括标题、列表、代码块等
- 🎨 **代码高亮** - 代码块自动语法高亮显示
- 🌊 **流式响应** - 支持 SSE 流式输出，边生成边展示
- 🎯 **对话管理** - 支持创建、切换和删除多个对话
- 🌙 **暗色模式** - 自动适配亮色/暗色主题
- 📱 **响应式设计** - 适配各种屏幕尺寸
- 👍 **消息反馈** - 支持对 AI 回复点赞/点踩
- 🔄 **重新生成** - 支持重新生成 AI 回复
- 🚀 **多 Provider 支持** - 支持 Mock、OpenAI 兼容接口、Ollama 三种模式

## 技术栈 🛠️

- **框架**: Next.js 16 (App Router)
- **React**: 19.2.7
- **UI 组件**: shadcn/ui + Radix UI
- **样式**: Tailwind CSS 4
- **状态管理**: Zustand 5
- **Markdown**: react-markdown + remark-gfm + rehype-highlight
- **图标**: Lucide React
- **语言**: TypeScript 5

## 快速开始 🚀

### 环境要求

- Node.js 24+
- npm / yarn / pnpm

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 配置环境变量

复制 `.env.example` 文件为 `.env.local` 并配置您的 API 密钥：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件：

```env
# OpenAI/阿里云 DashScope API 配置
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
OPENAI_MODEL=qwen-max

# Ollama 配置
OLLAMA_BASE_URL=https://mlvoca.com/api/generate
OLLAMA_MODEL=deepseek-r1:1.5b

```

### 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
npm run start
```

## 使用说明 📖

### 基本操作

1. **发送消息**: 在输入框中输入内容，按 Enter 发送
2. **换行**: 按 Shift + Enter 换行
3. **终止生成**: 点击停止按钮终止 AI 回复
4. **新建对话**: 点击侧边栏的新建按钮
5. **切换对话**: 点击侧边栏中的历史对话
6. **删除对话**: 点击对话旁边的删除按钮

### 高级功能

- **消息反馈**: 点击消息下方的 👍 / 👌 按钮表达您对回复的喜好
- **重新生成**: 点击 🔄 按钮让 AI 重新生成回复

## 支持的 AI 服务 🤖

### Mock（默认）
模拟 AI 响应，用于测试和演示，无需配置 API Key。

### OpenAI 兼容接口
支持所有兼容 OpenAI API 格式的服务：
- 阿里云 DashScope（通义千问）
- OpenAI GPT 系列
- 其他兼容 OpenAI 格式的 API

### Ollama
支持本地部署的 Ollama 服务，可运行各种开源模型。

## 自定义主题 🎨

修改 `app/globals.css` 中的 CSS 变量可以自定义主题颜色：

```css
:root {
  --primary: oklch(0.55 0.2 255);  /* 主色调 */
  --background: oklch(1 0 0);      /* 背景色 */
  --foreground: oklch(0.145 0 0);  /* 前景色 */
}
```

## API 路由说明 🔌

### POST /api/chat

发送聊天请求的 API 端点。

**请求参数**:
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>,
  stream: boolean
}
```

**查询参数**:
- `provider`: 指定 AI 服务提供者（mock | openai | ollama）

**响应格式**: SSE (Server-Sent Events) 流式响应

```
event: delta
data: {"content": "AI 回复的内容片段"}
```

## 注意事项 ⚠️

- 默认使用 Mock 模式，无需 API Key 即可体验基本功能
- 对接真实 AI 服务需要配置相应的环境变量
- API Key 存储在 `.env.local` 文件中，不会被提交到 Git
- 生产环境部署时，请通过平台的环境变量功能配置密钥

## 部署 🚀

### Vercel 部署

1. Fork 本项目到您的 GitHub 账号
2. 在 Vercel 导入项目
3. 配置环境变量（OPENAI_API_KEY 等）
4. 点击部署

### Docker 部署

```bash
docker build -t next-chat .
docker run -p 3000:3000 -e OPENAI_API_KEY=your-key next-chat
```

## 开发脚本 📜

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run start    # 启动生产服务器
npm run lint     # 运行 ESLint 检查
```

## 许可证 📄

MIT License

## 贡献 🤝

欢迎提交 Issue 和 Pull Request！

---

**注意**: 本项目仅供学习参考使用。
