/**
 * 会话管理 slice
 * 职责：管理所有会话，包括创建、切换、删除会话
 */
import { generateId } from "./utils"
import type { StateCreator } from "zustand"
import type { Conversation, ConversationSlice, ChatStore } from "./types"

export const createConversationSlice: StateCreator<
    ChatStore,
    [['zustand/immer', never], ['zustand/devtools', never]],
    [],
    ConversationSlice
> = (set, get) => ({
    conversations: [],
    activeConversationId: null,
    getActiveConversation: () => {
        const { conversations, activeConversationId } = get()
        return conversations.find(c => c.id === activeConversationId)
    },

    createConversation: () => {
        const newConversation: Conversation = {
            id: generateId(),
            title: '新会话',
            messages: [],
            createdAt: Date.now(),
        }
        set((state) => {
            state.conversations.push(newConversation)
            state.activeConversationId = newConversation.id
        }, false, 'conversation/create')
        return newConversation.id
    },

    setActiveConversation: (id: string) => {
        set((state)=>{ 
            state.activeConversationId = id 
        }, false, 'conversation/setActive')
    },

    deleteConversation: (id: string) => {
        set((state) => {
            const index = state.conversations.findIndex(c => c.id === id)
            if (index === -1) return
            state.conversations.splice(index, 1)
            if (state.activeConversationId === id) {
                state.activeConversationId = state.conversations.at(-1)?.id ?? null
            }
        }, false, 'conversation/delete')
    },
    renameConversation: (id: string, title: string) => {
        const trimmed = title.trim()
        if (!trimmed) return
        set((state) => {
            const index = state.conversations.findIndex(c => c.id === id)
            if (index === -1) return
            state.conversations[index].title = trimmed
        }, false, 'conversation/rename')
    },
})