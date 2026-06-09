## zustand persist 中间件

### 是什么

**zustand persist 中间件** 是 zustand 提供的一个官方持久化中间件，它能将 store 中的状态自动序列化到持久化存储（默认 `localStorage`），并在应用启动时自动反序列化、恢复状态。

**核心价值**：
- 刷新 / 重启后状态依然保留
- 可自定义白名单，只持久化必要字段
- 可自定义存储引擎（localStorage / sessionStorage / AsyncStorage）
- 与 `immer`、`devtools` 等其他中间件无缝组合

---

### 基本用法

#### 1. 基础配置

```typescript
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface BearState {
    bears: number
    increase: (by: number) => void
}

const useBearStore = create<BearState>()(
    persist(
        (set) => ({
            bears: 0,
            increase: (by) => set((state) => ({ bears: state.bears + by })),
        }),
        {
            name: "bear-storage", // localStorage 的 key
        }
    )
)
```

#### 2. 使用 `partialize` 只持久化部分字段

```typescript
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ChatState {
    conversations: { id: string; title: string }[]
    activeConversationId: string | null
    isStreaming: boolean // ❌ 不应该被持久化
}

const useChatStore = create<ChatState>()(
    persist(
        (set) => ({
            conversations: [],
            activeConversationId: null,
            isStreaming: false,
        }),
        {
            name: "chat-storage",
            // ✅ 只持久化 conversations 和 activeConversationId
            partialize: (state) => ({
                conversations: state.conversations,
                activeConversationId: state.activeConversationId,
            }),
        }
    )
)
```

#### 3. 与 `immer` + `devtools` 组合

```typescript
import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { devtools, persist } from "zustand/middleware"

const useStore = create<MyState>()(
    devtools(
        persist(
            immer((set) => ({
                // ...
            })),
            { name: "my-storage" }
        ),
        { name: "my-store" }
    )
)
```

**组合顺序（从内到外）**：`immer` → `persist` → `devtools`。

#### 4. 多 slice 组合写法（本项目实际采用）

```typescript
import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { devtools, persist } from "zustand/middleware"

import { createConversationSlice } from "./conversation-slice"
import { createMessageSlice } from "./message-slice"
import { createStreamSlice } from "./stream-slice"
import { createFileSlice } from "./file-slice"
import { createOperationSlice } from "./operation-slice"

const STORAGE_KEY = "next-chat-storage"

export const useChatStore = create<ChatStore>()(
    devtools(
        persist(
            immer((...args) => ({
                ...createConversationSlice(...args),
                ...createMessageSlice(...args),
                ...createStreamSlice(...args),
                ...createFileSlice(...args),
                ...createOperationSlice(...args),
            })),
            {
                name: STORAGE_KEY,
                partialize: (state) => ({
                    conversations: state.conversations,
                    activeConversationId: state.activeConversationId,
                }),
            }
        ),
        { name: "chat-store" }
    )
)
```

---

### 核心原理：序列化 + 反序列化

#### 1. 数据持久化流程

```
store 更新
      │
      ▼
persist 中间件捕获变化
      │
      ▼
调用 partialize(state) 得到需要持久化的字段
      │
      ▼
JSON.stringify → 写入 storage（localStorage）
```

#### 2. 数据恢复流程

```
应用启动 / 页面刷新
      │
      ▼
从 storage 读取 JSON 字符串
      │
      ▼
JSON.parse → merge 回 store
      │
      ▼
UI 根据恢复后的状态渲染
```

#### 3. `partialize` —— 持久化白名单

这是最关键的配置项之一：

```typescript
partialize: (state) => ({
    conversations: state.conversations,
    activeConversationId: state.activeConversationId,
    // ❌ 不包含：isStreaming、pendingFiles、operationsMap 等临时状态
})
```

**为什么需要白名单**：
- 流式请求状态（`isStreaming`）刷新后恢复会导致 UI 异常
- 文件上传列表包含 `File` 对象，不可被 JSON 序列化
- 操作注册表中的 handler 是函数，同样不可序列化

---

### 有和没有 persist 中间件的区别

#### 没有 persist（纯内存状态）

```typescript
import { create } from "zustand"

const useStore = create((set) => ({
    conversations: [],
    addConversation: (item) =>
        set((state) => ({
            conversations: [...state.conversations, item],
        })),
}))

// 刷新页面 → conversations 丢失，需要用户重新输入
```

#### 有 persist 中间件

```typescript
import { create } from "zustand"
import { persist } from "zustand/middleware"

const useStore = create<ChatState>()(
    persist(
        (set) => ({
            conversations: [],
            addConversation: (item) =>
                set((state) => ({
                    conversations: [...state.conversations, item],
                })),
        }),
        {
            name: "chat-storage",
            partialize: (state) => ({
                conversations: state.conversations,
            }),
        }
    )
)

// 刷新页面 → conversations 自动从 localStorage 恢复
```

#### 对比总结

| 维度 | 纯内存 zustand | persist 中间件 |
|------|---------------|---------------|
| **刷新后状态** | 丢失 | 保留 |
| **持久化粒度** | 无 | 可通过 `partialize` 白名单控制 |
| **存储引擎** | 无 | localStorage / 自定义 |
| **SSR 场景** | 无特殊处理 | 需 hydration 等待客户端反序列化 |
| **函数 / File** | 可存于 state | 不可被 JSON 序列化，需排除 |
| **心智负担** | 低 | 需甄别哪些字段需要持久化 |

---

### 注意事项 & 常见问题

#### 1. SSR / hydration mismatch

```tsx
// ❌ 服务端没有 localStorage，直接渲染会导致 hydration mismatch
export function MessageList() {
    const messages = useChatStore((s) => s.getActiveConversation()?.messages)
    return <div>{messages?.length}</div>
}

// ✅ 用自定义 hook 延迟到水合完成后再渲染
export function MessageList() {
    const isHydrated = useHydration()
    const messages = useChatStore(
        (s) => s.getActiveConversation()?.messages
    )

    if (!isHydrated) return null // 或返回骨架屏

    return <div>{messages?.length}</div>
}
```

#### 2. 不要持久化函数 / File / 临时状态

```typescript
// ❌ 错误：函数、File 对象不可被 JSON 序列化
partialize: (state) => ({
    operationsMap: state.operationsMap, // 包含函数，会变成 {}
    pendingFiles: state.pendingFiles,   // 含 File 对象，序列化失败
    isStreaming: state.isStreaming,     // 临时 UI 状态，恢复会导致错乱
})

// ✅ 正确：只保留纯数据结构
partialize: (state) => ({
    conversations: state.conversations,
    activeConversationId: state.activeConversationId,
})
```

#### 3. 与 `immer` 配合使用的 set 签名

```typescript
// ✅ immer 中使用可变语法，persist 会序列化最终状态
set(
    (state) => {
        state.conversations.push(newConversation)
        state.activeConversationId = newConversation.id
    },
    false,
    "conversation/create" // ← 便于在 devtools 中追踪
)
```

#### 4. 自定义存储引擎

```typescript
import { create } from "zustand"
import { persist, type PersistStorage } from "zustand/middleware"

const sessionStorage: PersistStorage<MyState> = {
    getItem: (name) => {
        const str = window.sessionStorage.getItem(name)
        return str ? JSON.parse(str) : null
    },
    setItem: (name, value) =>
        window.sessionStorage.setItem(name, JSON.stringify(value)),
    removeItem: (name) => window.sessionStorage.removeItem(name),
}

const useStore = create<MyState>()(
    persist(
        (set) => ({ /* ... */ }),
        {
            name: "my-store",
            storage: () => sessionStorage, // ← 自定义引擎
        }
    )
)
```

#### 5. 手动清除 / 恢复

```typescript
// 清除已持久化的数据
useChatStore.persist.clearStorage()

// 手动 rehydrate（如用户登录后）
await useChatStore.persist.rehydrate()

// 获取持久化配置
const options = useChatStore.persist.getOptions()
```

---

### 实践建议

1. **持久化白名单**：显式列出需要持久化的字段，避免隐式保留临时状态
2. **SSR 水合**：服务端渲染场景下，需等待客户端 rehydrate 完成后再渲染依赖持久化数据的 UI
3. **多 slice 项目**：各 slice 的 action 保持纯数据操作，避免写入函数 / DOM 对象
4. **调试**：配合 `devtools` 中间件，可在 Redux DevTools 中查看每次 persist 的变化 diff
5. **版本兼容**：数据结构升级时考虑 `migrate` 配置，避免旧版本数据导致反序列化失败

---

### 总结

zustand persist 中间件通过 **自动序列化 / 反序列化** 的方式实现状态持久化，配合 `partialize` 白名单可以精确控制持久化范围。在多 slice + immer + devtools 的组合架构中，需要特别注意：**只能持久化纯数据结构**，函数、File 对象、临时 UI 状态均应排除，同时 SSR 场景需要 `useHydration` 来避免 hydration mismatch。
