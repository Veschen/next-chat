/**
 * 聊天状态管理：会话列表 + 消息列表 + 流式请求
 * 基于 zustand + CRequest 实现
 */
import { create } from "zustand"
import type { SSEOutput } from "./stream"
import { CRequest, CRequestClass } from "./request"
import type { CRequestParams, CRequestOptions, CRequestCallbacks } from "./request"

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

type ChatStateSetter = (fn: (state: ChatState) => Partial<ChatState>) => void

interface StreamCallbacksResult {
    callbacks: CRequestCallbacks<SSEOutput>
    getAccumulate: () => string
}

// 这里使用模块级变量，而不使用store是因为遵循zustand 最佳实践： store放状态，模块变量放副作用引用
let currentRequest: CRequestClass | null = null

function generateId(): string {
    // 生成唯一ID：时间戳+随机数 格式类似 '1780022111215-0nd72u'
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 创建流式请求回调函数
 */
function createStreamCallBacks(
    set: ChatStateSetter,
    conversationId: string,
    targetMessageId: string,
): StreamCallbacksResult {
    let accumulated = ''
    const callbacks: CRequestCallbacks<SSEOutput> = {
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
                                msg.id === targetMessageId ?
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
                                msg.id === targetMessageId ?
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
                                msg.id === targetMessageId?
                                    { ...msg, content: errorContent }
                                    : msg
                            )),
                        }
                    }),
                }))
                currentRequest = null
            }
    }
    return {
        callbacks,
        getAccumulate: () => accumulated,
    }
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

        // 这里使用get()获取最新的消息列表，因为set新增了新的消息
        const allMessage = get()
            .conversations.find(c => c.id === conversationId)
            ?.messages.filter(msg => !msg.loading)
            .map(msg => ({ role: msg.role, content: msg.content }))

        const params: CRequestParams = {
            messages: allMessage,
            stream: true,
        }

        const { callbacks } = createStreamCallBacks(set, conversationId, assistantMessage.id)

        request.send(params, callbacks)
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

        const conversationId = conversation.id

        // 找到最后一条assistant消息
        const lastAssistant = [...conversation.messages].reverse().find(msg => msg.role === 'assistant')
        if (!lastAssistant) return

        // 重置该 assistant 消息为loading状态
        set((state) => ({
            conversations: state.conversations.map(c => {
                if (c.id !== conversationId) return c
                return {
                    ...c,
                    messages: c.messages.map(msg => (
                        msg.id === lastAssistant.id ? { ...msg, loading: true, feedback: null } : msg
                    ))
                }
            })
            ,
            isStreaming: true,
        }))

        // 收集 assistant 消息之前的所有非loading消息作为上下文
        const allMessages =  conversation.messages.filter(msg => !msg.loading && msg.id !== lastAssistant.id)
        .map(msg => ({ role: msg.role, content: msg.content }))

        const request = CRequest(requestOptions)
        currentRequest = request
        const { callbacks } = createStreamCallBacks(set, conversationId, lastAssistant.id)
        request.send({
            messages: allMessages,
            stream: true,
        }, callbacks)
    }
}))
