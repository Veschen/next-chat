# 流式请求中止后内容被"流超时"覆盖的问题

## 问题描述

用户点击「暂停」中止流式输出后，消息内容短暂显示已接收的文本，但几秒后被覆盖为 `请求失败：流超时`，丢失了已经接收到的内容。

## 根因分析

### 涉及的关键模块

- `lib/request.ts` 中的 `CRequestClass`：封装了流式请求客户端，内部维护了多个定时器（`timeoutTimer`、`streamTimeoutTimer`、`retryTimer`）
- `lib/store/stream-slice.ts`：zustand store 的流式请求管理 slice

### 问题的本质：abort 不彻底

在改造「将流式请求状态从模块变量移入 store」时，做了一个错误决策——只将 `AbortController` 存入 store，`abortStream` 调用 `AbortController.abort()`。

```typescript
// ❌ 错误做法：只中止了网络请求，没有清除 CRequestClass 内部的定时器
abortStream: () => {
    const { streamAbortController } = get()
    streamAbortController?.abort()  // 只中止了 fetch
}
```

这导致了一个**竞态条件**：

1. 用户点击暂停 → `AbortController.abort()` → fetch 抛出 `AbortError`
2. `onError` 回调正确处理：保留已接收内容或显示"已取消"
3. 但 `CRequestClass` 内部的 `streamTimeoutTimer` **仍在运行**
4. 几秒后定时器触发 → 再次调用 `onError(new Error('流超时'))` → 覆盖消息内容

而 `CRequestClass.abort()` 方法会同时做两件事：

```typescript
abort() {
    this.abortController?.abort()   // 中止网络请求
    this.clearALLTimers()           // 清除所有内部定时器
}
```

### 为什么不能把 CRequestClass 实例存入 Immer store

尝试过将整个 `CRequestClass` 实例存入 zustand store（使用 immer 中间件），但 Immer 的 `WritableDraft` 会递归展开 class 实例的所有私有属性，导致类型不兼容：

```
Type 'WritableNonArrayDraft<CRequestClass>' is missing the following properties 
from type 'CRequestClass': baseURL, maxRetries, abortController, timeoutTimer...
```

**class 实例包含方法和内部状态，不适合放进 Immer 管理的 store。**

## 解决方案

回归 zustand 最佳实践：**store 放状态（可序列化数据），模块变量放副作用引用（class 实例、定时器等）**。

```typescript
// ✅ 正确做法：模块级变量存 CRequestClass 实例
let currentRequest: CRequestClass | null = null

// abortStream 调用 request.abort()，同时清除所有定时器
abortStream: () => {
    currentRequest?.abort()   // abort() 内部会 abortController.abort() + clearALLTimers()
    currentRequest = null
}
```

## 反思沉淀

### 1. 区分"状态"和"副作用引用"

在 zustand + immer 架构中，有一条重要的分界线：

| 放 store | 放模块变量 |
|---------|----------|
| UI 需要响应的数据（isStreaming, messages） | 副作用引用（请求实例、定时器、WebSocket 连接） |
| 可序列化、可被 Immer draft 代理 | class 实例、含私有状态/方法的对象 |

**不要因为"想统一管理"就把所有东西都塞进 store**。class 实例有自己的生命周期和内部状态，强行放进 Immer 会破坏其类型系统。

### 2. abort 必须是"原子操作"

中止一个流式请求不只是取消网络连接，还需要清理所有关联的副作用（定时器、重试队列等）。如果把这些拆散到不同地方管理，很容易漏掉某一环。

**最佳实践**：让"创建"和"销毁"在同一抽象层级完成。`CRequestClass` 既管创建（`send`）又管销毁（`abort`），调用方只需调用 `abort()` 即可，不要绕过它直接操作内部的 `AbortController`。

### 3. 警惕"看起来能用"的竞态条件

这类 bug 的隐蔽之处在于：正常流程下 `onSuccess` 会在 `streamTimeoutTimer` 触发前被调用，一切正常。只有在用户主动中止这个边缘场景下，fetch 立即结束但定时器仍在跑，竞态才暴露。**测试时要覆盖 abort/cancel 路径**。