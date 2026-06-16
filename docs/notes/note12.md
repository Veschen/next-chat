## Markdown 渲染架构重构：分块解析 + 独立渲染 + 流式优化

### 背景：为什么要改动

之前的 `markdown-render.tsx` 存在以下结构性问题：

1. **巨型组件，职责混杂**：`MarkdownRender` 组件内部同时承载了 `CodeBlock`（含复制逻辑、Mermaid/Card/EChart/HTML 分发）、流式打字效果、插件配置、自定义渲染器匹配等所有逻辑。近 200 行的单一组件难以理解和修改。

2. **全量重渲染，性能浪费**：整个内容通过 `<ReactMarkdown>` 一次性渲染。在流式场景下，内容每增长几个字符就会触发整棵 ReactMarkdown 组件树的重渲染。即使 99% 的内容块没有变化，也要重新走一遍 Markdown 解析和 React 协调流程。长消息场景下（数千字的 AI 回复），这种开销非常明显。

3. **`setInterval` 流式输出的固有问题**：
   - 定时器精度有限（最小约 4ms），且与浏览器刷新率（60fps ≈ 16.6ms）不同步，容易出现跳帧或重复渲染
   - 无自适应能力：当内容增长速度快于打字速度时，会产生内容积压，用户看到的打字效果滞后于实际接收
   - 组件卸载时定时器清理不彻底可能引发内存泄漏

4. **缺乏组件级容错**：Mermaid 图表、EChart 图表、HTML 渲染等扩展组件如果抛异常，会导致整个消息气泡崩溃，用户看到空白或错误页面。在流式场景下（内容可能暂时不完整），这种情况更容易触发。

5. **流式内容边界不完整**：AI 流式输出过程中，Markdown 语法标记经常处于"半成品"状态 —— 代码块的 ` ``` ` 可能只写了一半、粗体 `**` 只有一个闭合标记、HTML 标签未闭合。直接交给 `ReactMarkdown` 渲染会产出错乱的格式，导致视觉闪烁。

---

### 改了什么

#### 1. 新增 `lib/markdown/parse-blocks.ts` —— 块级解析

引入 `marked` 库的 lexer，将 Markdown 内容解析为结构化的 **块（Block）数组**：

```
输入: "# 标题\n这是一段文字\n```js\ncode```"
输出: [
  { key, content: "# 标题\n", type: "heading", startIndex: 0, endIndex: 5, isIncomplete: false },
  { key, content: "这是一段文字\n", type: "paragraph", ... },
  { key, content: "```js\ncode```", type: "code", ... isIncomplete: true },
]
```

每个 Block 携带类型、位置区间、是否不完整（流式中）等元信息。最后一块标记为 `isIncomplete: true`，供后续渲染阶段做视觉区分。

#### 2. 新增 `lib/markdown/remend.ts` —— 不完整语法修复

针对流式场景下 Markdown 语法标记"半成品"的问题，提供两层修复：

**第一层 `remend()`** —— 修复不完整标记（消息结束时调用）：
- 未闭合的 inline code `` ` `` → 移除多余的 backtick
- 未闭合的粗体 `**` / 斜体 `*` → 移除孤立标记
- 未闭合的链接 `[text]` → 转为纯文本
- 孤立的表格分隔行 `|---|---|` → 移除
- 未闭合的 HTML 标签 → 自动补齐闭合标签（用标签栈追踪）
- 未闭合的块级公式 `$$` → 移除孤立标记

**第二层 `holdBackPartialMarkers()`** —— 流式进行中隐藏可能不完整的尾部标记：
- Setext 风格的标题标记（`\n--`、`\n==`）→ 暂不显示
- 尾部 1~2 个不完整的 backtick → 暂不显示

这相当于"先修再渲染"，确保交给 `ReactMarkdown` 的内容是合法（或至少无害）的。

#### 3. 新增 `components/chat/memoized-block.tsx` —— 块级独立渲染 + Memo

将原来 `MarkdownRender` 内部的 `CodeBlock` + 整个 `ReactMarkdown` 渲染拆分为 **每个 Block 独立渲染**：

- `BlockContent`：对单个 `MarkdownBlock` 调用 `ReactMarkdown` 渲染，独立配置 remark/rehype 插件
- `MemoizedBlock`：通过 `React.memo` + 自定义比较函数 `blockAreEqual`，只在该块的内容、位置、是否不完整、启用的功能等关键属性变化时才重新渲染
- 每个扩展渲染（Mermaid、EChart、HTML、Card）外层包裹 `ComponentErrorBoundary`，异常隔离

#### 4. 新增 `components/chat/component-error-boundary.tsx` —— 组件级错误边界

React Class Component 实现的 Error Boundary，捕获子组件渲染异常：
- 默认展示红色错误提示卡片，显示异常的原始内容
- 支持自定义 fallback UI
- 支持 `onError` 回调上报

单个 Block 渲染失败只影响该 Block 的显示，不会导致整个消息消失。

#### 5. 重构 `components/chat/markdown-render.tsx` —— 简化为编排层

从 ~215 行精简到 ~77 行，只做编排：
1. 调用 `useStreamContent` 获取流式展示内容
2. 调用 `remend()` 修复不完整标记
3. 调用 `parseMarkdownIntoBlocks()` 分块
4. 遍历 blocks，每个包裹 `ComponentErrorBoundary` + `MemoizedBlock`

不再直接持有 `ReactMarkdown`、`CodeBlock`、复制按钮等实现细节。

#### 6. 重构 `lib/hooks/use-stream-content.ts` —— `setInterval` → `requestAnimationFrame`

核心改动：
- **RAF 替代 Interval**：`requestAnimationFrame` 与浏览器渲染周期同步，避免无效的中间帧计算
- **自适应步长 `calculateAdaptiveStep()`**：
  - 剩余 > 1000 字符 → 每帧输出 3 个字符（快速追赶）
  - 剩余 > 500 字符 → 每帧 2 字符
  - 剩余 > 100 字符 → 每帧 1 字符（正常节奏）
  - 剩余 ≤ 100 → 每帧 0.5 字符（逼近末尾时减速，自然过渡）
- **结尾兜底**：`isMessageEnd` 时调用 `holdBackPartialMarkers` 再显示最终内容，避免最后几个不完整标记引起的闪烁
- **增量边界缓存**：`createStreamBufferCalculator` 保留原有设计，只对增量内容计算边界

#### 7. 新增依赖 `marked` + `@types/marked`

`marked` 的 lexer（词法分析器）用于将 Markdown 文本按标准 AST 结构分块，替代手工正则切割。

---

### 改动带来的收益

| 维度 | 改动前 | 改动后 |
|------|--------|--------|
| **渲染性能** | 每次内容增长触发全量 `ReactMarkdown` 重渲染 | 仅变更的 Block 重渲染，不变 Block 命中 memo 缓存直接复用 |
| **稳定性** | 单个扩展组件异常 → 整个消息崩溃 | 异常被 `ComponentErrorBoundary` 捕获，仅该 Block 显示错误占位 |
| **流式视觉质量** | 不完整 Markdown 标记导致格式闪烁/错乱 | `remend` 修复 + `holdBackPartialMarkers` 暂隐，渲染内容始终合法 |
| **流式流畅度** | 固定间隔 `setInterval`，与屏幕刷新不同步 | `requestAnimationFrame` 同步刷新率 + 自适应步长智能追赶/减速 |
| **可维护性** | 单文件 215 行，解析/修复/渲染/流式全耦合 | 6 个模块各司其职：解析 / 修复 / 流式 / 块渲染 / 错误边界 / 编排 |
| **可测试性** | 几乎无法做单元测试，逻辑与 UI 交织 | `parseMarkdownIntoBlocks`、`remend`、`calculateAdaptiveStep` 等纯函数可独立测试 |

**一句话总结**：将 Markdown 渲染从"整体一次性`ReactMarkdown`渲染"重构为 **"marked 词法分块 → remend 修复不完整标记 → 独立 memo 块渲染 + 错误边界隔离"** 的流水线架构，同时将流式输出从 `setInterval` 升级为 `requestAnimationFrame` + 自适应步长，显著提升长消息场景的渲染性能、稳定性和视觉体验。
