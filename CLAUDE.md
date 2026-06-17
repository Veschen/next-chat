# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
npm run dev      # 开发服务器，http://localhost:3000
npm run build    # 生产构建
npm run start    # 启动生产服务器
npm run lint     # ESLint 检查（next/core-web-vitals + next/typescript）
```

无测试框架配置，当前项目不含测试。

## 技术栈

Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui + Zustand 5 (Immer + persist)

路径别名：`@/*` → 项目根目录 `./*`

## 架构总览

### API 层 — SSE 流式代理

`app/api/chat/route.ts` — 唯一的后端路由。POST 请求按 `?provider=` 参数分发到 Mock / OpenAI / Ollama 三种 provider。

- **Mock**：内置正则匹配场景，返回预制的 `thinking` + `message` SSE 事件流，无需 API Key
- **OpenAI**：兼容格式，默认对接通义千问（`dashscope.aliyuncs.com`），解析 `delta.reasoning_content` → `thinking` 事件、`delta.content` → `message` 事件
- **Ollama**：NDJSON 协议，将多轮消息拼接为单 prompt

所有 provider 统一输出 SSE 格式：`event: thinking|message|error|done\ndata: {"content":"..."}\n\n`。

### 流式请求客户端三层结构

1. **`lib/fetch.ts` — `CFetch`**：fetch 封装，支持 5xx 重试、AbortError 穿透
2. **`lib/stream.ts` — `SStream`**：`ReadableStream<Uint8Array>` → `TextDecoderStream` → `splitStream('\n\n')` → `splitPart('\n', ':')` → `AsyncReadableStream<SSEOutput>`（实现了 `AsyncIterable`）
3. **`lib/request.ts` — `CRequestClass`**：完整流式请求客户端，支持超时、流超时、重试、断点续传（Last-Event-ID）、abort。工厂函数 `CRequest(options)` 创建实例

### 状态管理 — Zustand Slice 模式

`lib/store/index.ts` 组合五个 slice，全部通过 Immer 中间件实现不可变更新：

| Slice                | 职责                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `conversation-slice` | 会话 CRUD（创建/切换/删除/重命名）                                                                                      |
| `message-slice`      | 消息反馈（👍/👎）、多版本切换（`children[]` + `currentIndex`）、编辑消息并截断后续                                      |
| `stream-slice`       | `sendMessage` / `abortStream` / `regenerateLastMessage`，管理流式请求生命周期，按 `conversationId` 隔离 AbortController |
| `file-slice`         | 待上传文件队列管理                                                                                                      |
| `operation-slice`    | **全局操作注册表**：pub/sub 模式解耦组件回调                                                                            |

**Operation 模式**（替代 props drilling）：`ChatLayout` 在 `useEffect` 中调用 `registerOperations` 注册回调函数，深层子组件（如 `CardBlock` 按钮）通过 `getOperation('sendMessage')` 查找并调用。操作名常量定义在 `OPERATION_NAMES`。

**持久化**：localStorage key `next-chat-storage`，仅持久化 `conversations`、`activeConversationId`、`provider`。

**消息结构**：每条消息有 `children: MessageContent[]`（多版本）和 `currentIndex`（当前展示版本）。`MessageContent` 包含 `content`、`thinking`（推理过程）、`isThinking`、`loading`、`thinkingDuration` 等字段。

### Markdown 渲染管线

`components/chat/markdown-render.tsx` 是核心入口，处理流程：

```
原始 content
  → useStreamContent (流式逐字动画，代码块边界感知的自适应步长)
  → remend() (修复未闭合的 markdown 标记，防止流式渲染崩溃)
  → parseMarkdownIntoBlocks() (marked 词法分析 → MarkdownBlock[])
  → MemoizedBlock × N (React.memo 包裹，按 content/startIndex/isIncomplete 判断是否需要重渲染)
    → ComponentErrorBoundary (每个块独立错误边界，一个块崩溃不影响其他块)
      → react-markdown (remark-gfm + remark-math + rehype-highlight + rehype-katex)
        → code 组件按 language 路由到自定义渲染器
```

**自定义代码块路由**（在 `MemoizedBlock` 的 `code` 组件中）：

- `mermaid` → `<MermaidDiagram>`（通过 `mermaid` 库渲染 SVG）
- `echart` → `<EChartBlock>`（通过 `echarts` 渲染图表）
- `card` → `<CardBlock>`（JSON 数据驱动的交互卡片，支持 tabs、buttons、表单。按钮通过 `onSendMessage` 回调触发新一轮对话）
- `html` → `<HTMLBlock>`（沙箱 iframe 渲染）
- 其他 → 语法高亮代码块 + 复制按钮

**注意**：以上四种特殊语言需要从 DOM textContent 读取原始内容（而非 React children），因为 react-markdown 会将代码块内容解析为嵌套的 JSX 节点。

### Markdown 扩展系统

`components/chat/markdown-extensions/component-registry.tsx` 提供 React Context 插件机制：

- `MarkdownPluginProvider` 包裹组件树，传递 `MarkdownPluginConfig`（mermaid/math 开关 + 自定义渲染器列表）
- `CustomCodeBlockRenderer` 接口：`{ language: string | string[], component: React.ComponentType }`
- `findCustomRenderer()` 按语言标签匹配自定义渲染器

### 流式内容的 Markdown 修复

`lib/markdown/remend.ts` 在流式渲染过程中修复未闭合的标记：

- `fixUnclosedInlineCode` — 移除不成对的 `` ` ``（跳过代码块内）
- `fixUnclosedBoldAndItalic` — 移除不成对的 `**` 和 `*`
- `fixUnclosedLinks` — 将孤立的 `[text]` 转为纯文本
- `fixUnclosedHtmlTags` — 移除未闭合的 HTML 标签（跳过代码块内）
- `fixTableSeparatorRow` — 移除孤立的分隔行
- `fixUnclosedMath` — 移除不成对的 `$$`
- `holdBackPartialMarkers` — 暂扣流式末端的部分标记字符

### 打字机动画

`lib/hooks/use-stream-content.ts` 实现流式内容的逐字显示动画：

- 基于 `requestAnimationFrame` 的字符级动画
- `calculateBoundaries()` 识别代码块（` ``` `）、数学块（`$$`）、HTML 标签的边界，动画在这些边界处自然暂停
- 自适应步长：剩余字符 > 1000 时加速，< 100 时减速
- 首屏加载优化：首帧内容 > 100 字符时直接全量渲染，跳过动画

### 可嵌入组件 Entrance

`components/ai-assistant/entrance.tsx` 是独立的嵌入式 AI 助手面板，接收 `agentPresets`（预设角色 + FAQ 问题列表），可嵌入任意页面，不依赖全局 store。

### 组件目录约定

- `components/ui/` — shadcn/ui 基础组件（button、input、card 等）
- `components/chat/` — 聊天界面组件（核心渲染器、扩展块、消息气泡等）
- `components/ai-assistant/` — 可嵌入的 AI 助手组件
- `components/chat/markdown-extensions/` — 自定义 Markdown 代码块渲染器

### 新增自定义代码块类型

1. 在 `components/chat/markdown-extensions/` 下创建新组件
2. 在 `MemoizedBlock`（`memoized-block.tsx`）的 `BlockCodeBlock` 函数中添加 `if (language === 'xxx')` 分支
3. 将对应的语言标签加入 `RAW_TEXT_LANGUAGE` set（如需从 DOM 读取原始文本）
4. 如需通过插件配置注入，使用 `MarkdownPluginProvider` 的 `customRenderers`
