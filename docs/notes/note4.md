## ReadableStream 背压机制

### 什么是背压（Backpressure）

背压是流式处理中的一种流量控制机制，当数据生产者的速度超过消费者的处理能力时，消费者可以通过背压机制通知生产者减缓数据推送速度，从而避免内存溢出或数据丢失。

### 背压问题的产生

在流式传输中，如果生产者（如服务器发送 SSE 数据）发送数据的速度远快于消费者（如浏览器渲染 UI）处理数据的速度，会导致：

- 📦 **内存堆积**：未处理的数据不断堆积在缓冲区
- 💥 **内存溢出**：缓冲区耗尽导致程序崩溃
- ⚡ **性能下降**：大量未处理数据占用 CPU 和内存资源

### ReadableStream 的背压机制原理

ReadableStream 内置了背压控制机制，主要通过以下方式实现：

#### 1. Pull 模式 vs Push 模式

| 模式 | 特点 | 适用场景 |
|------|------|----------|
| **Pull（拉取）** | 消费者主动请求数据 | 消费者速度较慢时 |
| **Push（推送）** | 生产者主动推送数据 | 生产者速度较慢时 |

#### 2. 背压控制流程

```
┌─────────────────────────────────────────────────────────────┐
│                    背压控制流程                              │
├─────────────────────────────────────────────────────────────┤
│  生产者                    流控制器                    消费者 │
│    │                          │                          │   │
│    │─── enqueue(chunk) ──────▶│                          │   │
│    │                          │                          │   │
│    │◀── shouldContinue? ──────│                          │   │
│    │                          │                          │   │
│    │                          │─── pull() ─────────────▶│   │
│    │                          │◀── read(chunk) ────────│   │
│    │                          │                          │   │
└─────────────────────────────────────────────────────────────┘
```

#### 3. 核心 API

- **`controller.enqueue(chunk)`**：向流中添加数据块
- **`controller.desiredSize`**：返回当前队列中剩余空间（负数表示溢出）
- **`reader.read()`**：从流中读取数据块（返回 Promise）
- **`reader.cancel()`**：取消读取并关闭流

### 在 AI 流式输出中的应用

在你的聊天应用中，背压机制尤为重要：

```typescript
// SSE 流式响应示例（已实现背压控制）
const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
        for (let i = 0; i < chunks.length; i++) {
            // 检查背压状态
            while (controller.desiredSize <= 0) {
                // 等待消费者处理数据
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            const sseEvent = `event: delta\ndata: ${JSON.stringify({ content: chunks[i] })}\n\n`;
            controller.enqueue(encoder.encode(sseEvent));
        }
        controller.close();
    }
});
```

### 背压控制策略

#### 策略 1：等待并重试

```typescript
while (controller.desiredSize <= 0) {
    await new Promise(resolve => setTimeout(resolve, 10));
}
```

#### 策略 2：丢弃数据（适用于非关键数据）

```typescript
if (controller.desiredSize > 0) {
    controller.enqueue(chunk);
} else {
    // 丢弃数据或放入缓冲区
    console.warn('背压警告：数据已丢弃');
}
```

#### 策略 3：动态调整发送速率

```typescript
const baseDelay = 50;
const backpressureFactor = Math.max(1, 1 - controller.desiredSize / 1000);
await delay(baseDelay * backpressureFactor);
```

### 背压机制的优势

- ✅ **防止内存溢出**：自动控制数据流量
- ✅ **资源优化**：避免不必要的数据生成
- ✅ **响应式调整**：根据消费者能力动态调整
- ✅ **优雅降级**：在高负载时保持系统稳定

### 注意事项

1. **不要忽略背压**：始终检查 `controller.desiredSize`
2. **合理设置延迟**：避免 CPU 空转
3. **错误处理**：处理流关闭和取消事件
4. **缓冲区大小**：根据应用场景调整队列容量

### 实际案例分析

在你的聊天应用中，当 AI 生成速度超过 UI 渲染速度时：

```
场景：AI 每秒生成 100 个 token，UI 每秒只能渲染 50 个

无背压控制：
┌─────────────────────────────────────────────┐
│ 时间: 0s   队列: 50 tokens (溢出)          │
│ 时间: 1s   队列: 150 tokens (严重溢出)     │
│ 时间: 2s   队列: 250 tokens (内存警告)     │
│ 时间: 3s   崩溃: Out of Memory             │
└─────────────────────────────────────────────┘

有背压控制：
┌─────────────────────────────────────────────┐
│ 时间: 0s   队列: 50 tokens → 暂停生成       │
│ 时间: 0.5s 队列: 25 tokens → 恢复生成       │
│ 时间: 1s   队列: 50 tokens → 暂停生成       │
│ 时间: 2s   队列: 0 tokens → 正常生成        │
└─────────────────────────────────────────────┘
```

### 总结

背压机制是流式处理的核心保障，通过 ReadableStream 的内置控制，可以有效平衡生产者和消费者的速度差异，确保系统稳定运行。在 AI 流式输出场景中，合理使用背压控制是提升用户体验和系统稳定性的关键。

