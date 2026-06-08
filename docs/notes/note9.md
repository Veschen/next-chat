# Tailwind CSS v4 文本不换行问题排查记录

## 问题现象

在 Markdown 渲染的自定义 Card 组件中，中文文本不换行，超出容器宽度后被 `overflow-hidden` 截断。

卡片设置了 `max-width: 380px`，内部文本容器（`<p>` 标签）计算宽度为 300px，但文字始终只显示一行（高度 16px），不会自动换行。

## 排查过程中的错误方向

尝试过以下方案均**无效**：

- `break-words` / `break-all` / `overflow-wrap: anywhere` — 不生效
- `min-w-0` + `flex: 1` — flex 布局经典方案，不生效
- `w-0 flex-1` — 强制 flex 子元素宽度为 0，不生效
- 改用 `grid-cols-[auto_1fr]` — grid 布局，不生效
- 改用 `position: absolute` + `padding-left` — 完全避开 flex/grid，不生效
- 内联 `style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}` — 不生效

## 根本原因

**Tailwind CSS v4 的 `text-wrap-mode: nowrap` 继承属性！**

通过 DevTools Computed 面板发现，从卡片到 `<p>` 标签的每一层都有：

```
text-wrap-mode: nowrap
```

这是一个**继承属性**，由上层的某个样式（可能是 `prose` 或全局 reset）设置后，会一直继承到所有子元素。导致无论怎么设置 `word-break`、`overflow-wrap`，文本都不会换行——因为 `text-wrap-mode: nowrap` 直接禁止了换行行为。

## 解决方案

在 Card 组件根元素上显式设置 `text-wrap: wrap`：

```tsx
<Card 
  className="not-prose my-4 text-sm text-wrap" 
  style={{ maxWidth: '380px', width: '100%', textWrap: 'wrap' }}
>
```

- `text-wrap` — Tailwind v4 的 utility class，设置 `text-wrap: wrap`
- `style={{ textWrap: 'wrap' }}` — 内联样式兜底，确保覆盖继承值

## 关键教训

1. **`text-wrap-mode` 是 CSS 新属性**（Tailwind v4 使用），优先级高于 `word-break` / `overflow-wrap`。当它为 `nowrap` 时，其他换行属性全部失效。
2. **排查文本不换行问题时，第一步应该检查 DevTools Computed 面板中的 `text-wrap-mode` 和 `white-space` 属性**，而不是盲目加各种 break/overflow 类。
3. **Tailwind v4 的 `prose` 或全局样式可能会设置 `text-wrap-mode: nowrap`**，通过 `not-prose` 脱离 typography 后需要手动重置。
4. 继承属性问题需要从 Computed 面板的「继承链」入手排查，而非在当前元素上反复尝试。