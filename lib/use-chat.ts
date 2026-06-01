/**
 * 聊天状态管理：会话列表 + 消息列表 + 流式请求
 * 基于 zustand + CRequest 实现
 */
import { create } from "zustand"
import type { SSEOutput } from "./stream"
import { CRequest, CRequestClass } from "./request"
import type { CRequestParams, CRequestOptions } from "./request"

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    /** 消息创建时间 */
    timestamp: number
    loading?: boolean
    feedback?: 'like' | 'dislike' | null
}

export interface Conversation {
    id: string
    title: string
    messages: ChatMessage[]
    /** 会话创建时间 */
    createdAt: number
}

interface ChatState {
    conversations: Conversation[]
    activeConversationId: string | null
    isStreaming: boolean

    /** 获取当前激活的会话 */
    getActiveConversation: () => Conversation | undefined
    /** 创建新会话 */
    createConversation: () => string
    /** 切换到指定会话 */
    setActiveConversation: (id: string) => void
    /** 删除会话 */
    deleteConversation: (id: string) => void
    /** 发送消息（触发流式请求） */
    sendMessage: (content: string, requestOptions: CRequestOptions) => void
    /** 中止当前流式请求 */
    abortStream: () => void
    /** 设置消息反馈 */
    setMessageFeedback: (id: string, feedback: 'like' | 'dislike'| null) => void
    /** 重新生成最后一条回复 */
    regenerateLastMessage: (requestOptions: CRequestOptions) => void
}

// 这里使用模块级变量，而不使用store是因为遵循zustand 最佳实践： store放状态，模块变量放副作用引用
let currentRequest: CRequestClass | null = null

function generateId(): string {
    // 生成唯一ID：时间戳+随机数 格式类似 '1780022111215-0nd72u'
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useChatStore = create<ChatState>((set, get) => ({
    conversations: [],
    activeConversationId: null,
    isStreaming: false,

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
        set((state) => ({
            conversations: [...state.conversations, newConversation],
            activeConversationId: newConversation.id,
        }))
        return newConversation.id
    },

    setActiveConversation: (id: string) => {
        set({ activeConversationId: id })
    },

    deleteConversation: (id: string) => {
        set((state) => {
            const filtered = state.conversations.filter(c => c.id !== id)
            const nextActiveId =
                state.activeConversationId === id
                    ? filtered[0]?.id ?? null
                    : state.activeConversationId
            return {
                conversations: filtered,
                activeConversationId: nextActiveId
            }
        })
    },

    sendMessage: (content: string, requestOptions: CRequestOptions) => {
        const state = get()
        let conversationId = state.activeConversationId

        // 如果没有激活会话，创建一个
        if (!conversationId) {
            conversationId = state.createConversation()
        }

        const userMessage: ChatMessage = {
            id: generateId(),
            role: 'user',
            content,
            timestamp: Date.now(),
        }

        const assistantMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            loading: true,
        }

        // 添加用户消息 + 占位AI消息
        set((state) => ({
            conversations: state.conversations.map(c => {
                if (c.id !== conversationId) return c

                // 用首条用户消息作为会话标题
                const title = c.messages.length === 0
                    ? content.slice(0, 20) + (content.length > 20 ? '...' : '')
                    : c.title

                return {
                    ...c,
                    messages: [...c.messages, userMessage, assistantMessage],
                    title,
                }
            }),
            isStreaming: true,
        }))

        // 构建请求
        const request = CRequest(requestOptions)
        currentRequest = request

        const allMessage = get()
            .conversations.find(c => c.id === conversationId)
            ?.messages.filter(msg => !msg.loading)
            .map(msg => ({ role: msg.role, content: msg.content }))

        const params: CRequestParams = {
            messages: allMessage,
            stream: true,
        }

        let accumulated = ''

        request.send(params, {
            onUpdate: (chunk: SSEOutput) => {
                if (!chunk.data) return
                try {
                    const parsed = JSON.parse(chunk.data)
                    accumulated += parsed.content || ''
                } catch {
                    accumulated += chunk.data
                }
                set((state) => ({
                    conversations: state.conversations.map((c) => {
                        if (c.id !== conversationId) return c
                        return {
                            ...c,
                            messages: c.messages.map((msg) => (
                                msg.id === assistantMessage.id ?
                                    { ...msg, content: accumulated }
                                    : msg
                            )),
                        }
                    })
                }))
            },

            onSuccess: () => {
                set((state) => ({
                    isStreaming: false,
                    conversations: state.conversations.map(c => {
                        if (c.id !== conversationId) return c
                        return {
                            ...c,
                            messages: c.messages.map((msg) => (
                                msg.id === assistantMessage.id ?
                                    { ...msg, content: accumulated }
                                    : msg
                            )),
                        }
                    }),
                }))
                currentRequest = null
            },

            onError: (error: Error) => {
                const errorContent =
                    error.name === 'AbortError'
                        ? accumulated || '已取消'
                        : `请求失败：${error.message}`

                set((state) => ({
                    isStreaming: false,
                    conversations: state.conversations.map(c => {
                        if (c.id !== conversationId) return c
                        return {
                            ...c,
                            messages: c.messages.map((msg) => (
                                msg.id === assistantMessage.id ?
                                    { ...msg, content: errorContent }
                                    : msg
                            )),
                        }
                    }),
                }))
                currentRequest = null
            }
        })
    },

    abortStream: () => {
        currentRequest?.abort()
        currentRequest = null
    },

    setMessageFeedback: (id: string, feedback: 'like' | 'dislike'| null) => {
        set((state) => ({
            conversations: state.conversations.map((c) => ({
                ...c,
                messages: c.messages.map((msg) => (
                    msg.id === id ?
                        { ...msg, feedback: msg.feedback === feedback ? null : feedback }
                        : msg
                )),
            }))
        }))
    },

    regenerateLastMessage: (requestOptions: CRequestOptions) => {
        const state = get()
        const conversation = state.getActiveConversation()
        if (!conversation || state.isStreaming) return

        const lastAssistantIndex = [...conversation.messages].reverse().findIndex(msg => msg.role === 'assistant')
        if (lastAssistantIndex === -1) return

        const actualIndex = conversation.messages.length - 1 - lastAssistantIndex
        const userMessage = conversation.messages.slice(0, actualIndex).reverse().find(msg => msg.role === 'user')
        if (!userMessage) return

        // 删除最后一条assistant消息
        set((preState) => ({
            conversations: preState.conversations.map((c) => {
                if (c.id !== conversation.id) return c
                return {
                    ...c,
                    messages: c.messages.filter((_, index) => index !== actualIndex),
                }
            })
        }))

        // 用原 user 消息重新发送请求
        get().sendMessage(userMessage.content, requestOptions)
    }
}))
