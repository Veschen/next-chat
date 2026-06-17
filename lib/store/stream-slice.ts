/**
 * 流式请求管理 slice
 * 职责： 发送流式请求、处理流式响应、中止流式请求、重新发送流式请求
 */
import type { StateCreator } from "zustand"
import type {
    StreamSlice,
    ChatStore,
    ChatMessage,
    SSEEventType,
    MessageContent,
    FileItem
} from "./types"
import type { SSEOutput } from "../stream"
import type { CRequestParams, CRequestOptions, CRequestCallbacks } from "../request"
import { CRequest } from "../request"
import { generateId, getActiveContent } from "./utils"

type ImmerSet = Parameters<
    StateCreator<
        ChatStore,
        [["zustand/immer", never], ["zustand/devtools", never]],
        [],
        StreamSlice
    >
>[0]

/**模块级变量：当前正在处理的流式请求实例，按 conversationId 隔离 */
const currentStreamRequests = new Map<string, ReturnType<typeof CRequest>>()

function jsonSafeParse<T = Record<string, any>>(raw: string, fallback: T): T {
    try {
        return JSON.parse(raw)
    } catch {
        return fallback
    }
}

/** 查找目标消息的Immer helper */
function findTargetMessage(state: ChatStore, conversationId: string, targetMessageId: string) {
    const conversation = state.conversations.find((c) => c.id === conversationId)
    const message = conversation?.messages.find((msg) => msg.id === targetMessageId)
    return { conversation, message }
}

/** 创建多事件路由的流式请求回调函数*/
function createStreamCallBacks(
    set: ImmerSet,
    conversationId: string,
    targetMessageId: string
): CRequestCallbacks<SSEOutput> {
    let accumulatedContent = ""
    let accumulatedThinking = ""
    let thinkingStartTime: number | null = null
    let firstMessageReceived = false

    // 按event类型分发处理
    const eventHandlers: Record<SSEEventType, (data: Record<string, any>) => void> = {
        // 正常消息
        message: (data) => {
            // 首次message事件时记录思考耗时
            if (!firstMessageReceived && thinkingStartTime !== null) {
                const thinkingDuration = Date.now() - thinkingStartTime
                set(
                    (state) => {
                        const { message } = findTargetMessage(
                            state,
                            conversationId,
                            targetMessageId
                        )
                        const child = message && getActiveContent(message)
                        if (child) {
                            child.thinkingDuration = thinkingDuration
                        }
                    },
                    false,
                    "stream/onUpdate/thinkingDuration"
                )
            }
            firstMessageReceived = true

            accumulatedContent += data.content || ""
            set(
                (state) => {
                    const { message } = findTargetMessage(state, conversationId, targetMessageId)
                    const child = message && getActiveContent(message)
                    if (child) {
                        child.content = accumulatedContent
                        child.isThinking = false
                    }
                },
                false,
                "stream/onUpdate/message"
            )
        },
        // 思考中
        thinking: (data) => {
            // 首次thinking事件时开始计时
            if (thinkingStartTime === null) {
                thinkingStartTime = Date.now()
            }

            accumulatedThinking += data.content || ""
            set(
                (state) => {
                    const { message } = findTargetMessage(state, conversationId, targetMessageId)
                    const child = message && getActiveContent(message)
                    if (child) {
                        child.thinking = accumulatedThinking
                        child.isThinking = true
                    }
                },
                false,
                "stream/onUpdate/thinking"
            )
        },
        // 服务端错误
        error: (data) => {
            const errorText = data.message || data.content || "服务端错误"
            accumulatedContent = errorText
            set(
                (state) => {
                    const { message } = findTargetMessage(state, conversationId, targetMessageId)
                    const child = message && getActiveContent(message)
                    if (child) {
                        child.content = accumulatedContent
                        child.isThinking = false
                        child.loading = false
                    }
                    state.isStreaming = false
                },
                false,
                "stream/onUpdate/error"
            )
        },
        // 流结束
        done: () => {
            set(
                (state) => {
                    const { message } = findTargetMessage(state, conversationId, targetMessageId)
                    const child = message && getActiveContent(message)
                    if (child) {
                        child.content = accumulatedContent
                        child.isThinking = false
                        child.loading = false
                    }
                    state.isStreaming = false
                },
                false,
                "stream/onUpdate/done"
            )
        }
    }

    return {
        onUpdate: (chunk: SSEOutput) => {
            if (!chunk.data) return
            const eventType = (chunk.event || "message").trim() as SSEEventType
            const data = jsonSafeParse(chunk.data, { content: chunk.data })
            const handler = eventHandlers[eventType]
            if (handler) {
                handler(data)
            } else {
                console.debug(`stream未处理的事件类型: ${eventType}`, data)
            }
        },

        onSuccess: () => {
            // Immer 写法：直接修改状态
            set(
                (state) => {
                    state.isStreaming = false
                    const { message } = findTargetMessage(state, conversationId, targetMessageId)
                    const child = message && getActiveContent(message)
                    if (child) {
                        child.content = accumulatedContent
                        child.isThinking = false
                        child.loading = false
                    }
                },
                false,
                "stream/onSuccess"
            )
        },

        onError: (error: Error) => {
            const errorContent =
                error.name === "AbortError"
                    ? accumulatedContent || "已取消"
                    : `请求失败：${error.message}`

            // Immer 写法：直接修改状态
            set(
                (state) => {
                    state.isStreaming = false
                    const { message } = findTargetMessage(state, conversationId, targetMessageId)
                    const child = message && getActiveContent(message)
                    if (child) {
                        child.content = errorContent
                        child.isThinking = false
                        child.loading = false
                    }
                },
                false,
                "stream/onError"
            )
        }
    }
}

/** 发起流式请求 并将AbortController存储到store中*/
function startStreamRequest(
    set: ImmerSet,
    get: () => ChatStore,
    message: Array<{ role: "user" | "assistant"; content: string }>,
    conversationId: string,
    targetMessageId: string,
    requestOptions: CRequestOptions
) {
    // 如果该会话有进行中的流式请求，先取消
    currentStreamRequests.get(conversationId)?.abort()

    const request = CRequest(requestOptions)
    currentStreamRequests.set(conversationId, request)

    // 将AbortController存储到store中
    const callbacks = createStreamCallBacks(set, conversationId, targetMessageId)

    const params: CRequestParams = {
        messages: message,
        stream: true
    }
    request.send(params, callbacks)
}

export const createStreamSlice: StateCreator<
    ChatStore,
    [["zustand/immer", never], ["zustand/devtools", never]],
    [],
    StreamSlice
> = (set, get) => ({
    isStreaming: false,
    streamAbortController: null,
    sendMessage: (content: string, requestOptions: CRequestOptions, fileList?: FileItem[]) => {
        const state = get()
        let conversationId = state.activeConversationId

        // 如果没有激活会话，创建一个
        if (!conversationId) {
            conversationId = state.createConversation()
        }

        const assistantMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            children: [{ content: "", msgType: "text", loading: true }],
            currentIndex: 0,
            timestamp: Date.now()
        }

        // 获取当前是否处于编辑模式
        const editingIndex = state.getEditingMessageIndex()

        // Immer 写法：直接修改状态
        set(
            (state) => {
                const conversation = state.conversations.find((c) => c.id === conversationId)
                if (!conversation) return

                if (editingIndex >= 0) {
                    // 编辑模式：不添加新用户消息，直接添加 assistant 消息
                    // 编辑消息时，editMessage 已经更新了用户消息内容并删除了后续消息
                    // 所以当前最后一条消息就是被编辑的用户消息
                    conversation.messages.push(assistantMessage)
                    // 重置编辑状态
                    state.editingMessageIndex = -1
                } else {
                    // 正常模式：添加用户消息 + 占位AI消息
                    const userMessage: ChatMessage = {
                        id: generateId(),
                        role: "user",
                        children: [{ content, msgType: "text", fileList }],
                        currentIndex: 0,
                        timestamp: Date.now()
                    }
                    // 用首条用户消息作为会话标题
                    if (conversation.messages.length === 0) {
                        conversation.title =
                            content.slice(0, 20) + (content.length > 20 ? "..." : "")
                    }
                    conversation.messages.push(userMessage, assistantMessage)
                }
                state.isStreaming = true
            },
            false,
            "stream/sendMessage"
        )

        // 这里使用get()获取最新的消息列表，因为set新增了新的消息
        const allMessages =
            get()
                .conversations.find((c) => c.id === conversationId)
                ?.messages.filter((msg) => {
                    const child = msg.children[msg.currentIndex]
                    return child && !child.loading
                })
                .map((msg) => ({
                    role: msg.role,
                    content: msg.children[msg.currentIndex].content
                })) ?? []

        startStreamRequest(
            set,
            get,
            allMessages,
            conversationId,
            assistantMessage.id,
            requestOptions
        )
    },

    abortStream: () => {
        const state = get()
        const conversationId = state.activeConversationId
        if (conversationId) {
            currentStreamRequests.get(conversationId)?.abort()
            currentStreamRequests.delete(conversationId)
        }
        set(
            (state) => {
                state.isStreaming = false
            },
            false,
            "stream/abortStream"
        )
    },

    regenerateLastMessage: (requestOptions: CRequestOptions) => {
        const state = get()
        const conversation = state.getActiveConversation()
        if (!conversation || state.isStreaming) return

        const conversationId = conversation.id

        // 找到最后一条assistant消息
        const lastAssistant = [...conversation.messages]
            .reverse()
            .find((msg) => msg.role === "assistant")
        if (!lastAssistant) return

        // 重置该 assistant 消息为loading状态
        // Immer 写法：直接修改状态
        set(
            (state) => {
                const conv = state.conversations.find((c) => c.id === conversationId)
                if (!conv) return
                const msg = conv.messages.find((m) => m.id === lastAssistant.id)
                if (msg) {
                    const newChild: MessageContent = { content: "", msgType: "text", loading: true }
                    msg.children.push(newChild)
                    msg.currentIndex = msg.children.length - 1
                    msg.feedback = null
                }
                state.isStreaming = true
            },
            false,
            "stream/regenerateLastMessage"
        )

        // 收集 assistant 消息之前的所有非loading消息作为上下文
        const allMessages = conversation.messages
            .filter((msg) => {
                const child = msg.children[msg.currentIndex]
                return child && !child.loading && msg.id !== lastAssistant.id
            })
            .map((msg) => ({ role: msg.role, content: msg.children[msg.currentIndex].content }))

        startStreamRequest(set, get, allMessages, conversationId, lastAssistant.id, requestOptions)
    }
})
