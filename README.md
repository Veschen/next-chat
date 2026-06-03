# Next Chat 💬

一个基于 Next.js 14 的 AI 智能聊天应用，支持 Markdown 渲染、代码高亮和流式响应。
预览地址：[https://next-chat.vercel.app](https://next-chat.vercel.app)  （⚠️请使用代理访问）

## 功能特性

- 💬 **实时对话** - 支持与 AI 进行流畅的对话交互
- 📝 **Markdown 渲染** - 支持丰富的 Markdown 语法，包括标题、列表、代码块等
- 🎨 **代码高亮** - 代码块自动语法高亮显示
- 🌊 **流式响应** - 支持 SSE 流式输出，边生成边展示
- 🎯 **对话管理** - 支持创建、切换和删除多个对话
- 🌙 **暗色模式** - 自动适配亮色/暗色主题
- 📱 **响应式设计** - 适配各种屏幕尺寸

## 技术栈

- **框架**: Next.js 14 (App Router)
- **UI 组件**: shadcn/ui + Radix UI
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **Markdown**: react-markdown + remark-gfm + rehype-highlight
- **图标**: Lucide React

## 快速开始

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
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

## 项目结构

```
├── app/
│   ├── api/chat/          # 聊天 API 路由 (SSE 流式响应)
│   ├── globals.css        # 全局样式和主题配置
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── components/
│   ├── chat/              # 聊天相关组件
│   │   ├── chat-input.tsx       # 输入框组件
│   │   ├── chat-layout.tsx      # 聊天布局组件
│   │   ├── conversation-list.tsx # 对话列表组件
│   │   ├── message-bubble.tsx   # 消息气泡组件
│   │   ├── message-list.tsx      # 消息列表组件
│   │   └── markdown-render.tsx   # Markdown 渲染组件
│   └── ui/                # shadcn/ui 组件库
├── lib/
│   ├── request.ts         # 请求封装
│   ├── utils.ts           # 工具函数
│   └── use-chat.ts        # 聊天状态管理 (Zustand)
└── tailwind.config.ts     # Tailwind 配置
```

## 使用说明

1. **发送消息**: 在输入框中输入内容，按 Enter 发送
2. **换行**: 按 Shift + Enter 换行
3. **终止生成**: 点击停止按钮终止 AI 回复
4. **新建对话**: 点击侧边栏的新建按钮
5. **切换对话**: 点击侧边栏中的历史对话
6. **删除对话**: 点击对话旁边的删除按钮

## 自定义主题

修改 `app/globals.css` 中的 CSS 变量可以自定义主题颜色：

```css
:root {
  --primary: oklch(0.55 0.2 255);  /* 主色调 */
}
```

## 注意事项

- 当前 API 为模拟接口，仅供测试使用
- 如需对接真实 AI 服务，请修改 `app/api/chat/route.ts`
