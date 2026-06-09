/**
 *  ChatStore主入口
 * 使用zustand + immer + devtools + persist
 */
import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { devtools, persist } from "zustand/middleware"
import type { ChatStore, Conversation } from "./types"
import { createConversationSlice } from "./conversation-slice"
import { createMessageSlice } from "./message-slice"
import { createStreamSlice } from "./stream-slice"
import { createFileSlice } from "./file-slice"
import { createOperationSlice } from "./operation-slice"

// 持久化存储的键名
const STORAGE_KEY = 'next-chat-storage'

export const useChatStore = create<ChatStore>()(
    devtools(
        persist(
            immer((...args) => ({
                ...createConversationSlice(...args),
                ...createMessageSlice(...args),
                ...createStreamSlice(...args),
                ...createFileSlice(...args),
                ...createOperationSlice(...args),
                // Provider 状态
                provider: 'mock',
                setProvider: (provider: string) => {
                    const [set] = args
                    set((state) => {
                        state.provider = provider
                    })
                },
            })),
            {
                name: STORAGE_KEY,
                // 只持久化会话相关数据
                partialize: (state) => ({
                    conversations: state.conversations,
                    activeConversationId: state.activeConversationId,
                    provider: state.provider,
                }),
            }
        ),
        {
            name: 'chat-store',
        }
    ),
)
