"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { X, Bot, MessageSquare, History, Plus, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useChatStore } from "@/lib/store"
import { useHydration } from "@/lib/hooks/use-hydration"
import { MessageList } from "@/components/chat/message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { ConversationList } from "@/components/chat/conversation-list"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { PROVIDER_OPTIONS } from "@/lib/constants"
import { OPERATION_NAMES } from "@/lib/store/operation-slice"
import type { FileItem } from "@/lib/store/types"
import type { QuestionItem } from "@/lib/types"
import type { CRequestOptions } from "@/lib/request"
import {
    WELCOME_QUESTIONS,
    DEFAULT_SUGGESTIONS,
    REQUEST_OPTIONS,
    MOCK_SHORTCUTS
} from "@/lib/constants"

export interface AgentPreset {
    name: string
    description: string
    faq: QuestionItem[]
}

interface EntranceProps {
    visible: boolean
    onClose: () => void
    agentPresets?: AgentPreset[]
    onNewChat?: () => void
}

/**
 * AI 助手聊天面板组件
 * 支持欢迎页和对话界面切换，复用 MessageList 和 ChatInput
 */
export function Entrance({ visible, onClose, agentPresets = [], onNewChat }: EntranceProps) {
    const isHydrated = useHydration()
    const [showHistory, setShowHistory] = useState(false)

    // 从全局 store 获取状态
    const conversations = useChatStore((state) => state.conversations)
    const activeConversationId = useChatStore((state) => state.activeConversationId)
    const isStreaming = useChatStore((state) => state.isStreaming)
    const activeConversation = useChatStore((state) => state.getActiveConversation)
    const createConversation = useChatStore((state) => state.createConversation)
    const setActiveConversation = useChatStore((state) => state.setActiveConversation)
    const deleteConversation = useChatStore((state) => state.deleteConversation)
    const renameConversation = useChatStore((state) => state.renameConversation)
    const sendMessage = useChatStore((state) => state.sendMessage)
    const provider = useChatStore((state) => state.provider)
    const setProvider = useChatStore((state) => state.setProvider)
    const abortStream = useChatStore((state) => state.abortStream)
    const setMessageFeedback = useChatStore((state) => state.setMessageFeedback)
    const regenerateLastMessage = useChatStore((state) => state.regenerateLastMessage)
    const switchMessageVersion = useChatStore((state) => state.switchMessageVersion)
    const editMessage = useChatStore((state) => state.editMessage)

    // 文件上传相关
    const pendingFiles = useChatStore((state) => state.pendingFiles)
    const addFiles = useChatStore((state) => state.addFiles)
    const removeFile = useChatStore((state) => state.removeFile)
    const clearFiles = useChatStore((state) => state.clearFiles)
    const getReadyFiles = useChatStore((state) => state.getReadyFiles)

    // 注册全局操作
    const registerOperations = useChatStore((state) => state.registerOperations)
    const clearOperations = useChatStore((state) => state.clearOperations)

    const currentConversation = activeConversation()
    const messages = currentConversation?.messages ?? []

    // 根据 provider 动态生成 requestOptions
    const requestOptions: CRequestOptions = useMemo(
        () => ({
            ...REQUEST_OPTIONS,
            baseURL: `/api/chat?provider=${provider}`
        }),
        [provider]
    )

    // 使用 ref 存储最新的回调函数，避免频繁重注册
    const operationsRef = useRef({
        sendMessage,
        setMessageFeedback,
        regenerateLastMessage,
        switchMessageVersion,
        editMessage,
        requestOptions
    })

    // 每次渲染时更新 ref
    operationsRef.current = {
        sendMessage,
        setMessageFeedback,
        regenerateLastMessage,
        switchMessageVersion,
        editMessage,
        requestOptions
    }

    // 注册全局操作
    useEffect(() => {
        const handleSend = (content: string, fileList?: FileItem[]) => {
            const { sendMessage, requestOptions } = operationsRef.current
            sendMessage(content, requestOptions, fileList)
        }

        const handleGenerate = () => {
            const { regenerateLastMessage, requestOptions } = operationsRef.current
            regenerateLastMessage(requestOptions)
        }

        const handleEditMessage = (messageId: string, newContent: string) => {
            const { editMessage, sendMessage, requestOptions } = operationsRef.current
            editMessage(messageId, newContent)
            sendMessage(newContent, requestOptions)
        }

        registerOperations({
            [OPERATION_NAMES.SEND_MESSAGE]: handleSend,
            [OPERATION_NAMES.REGENERATE]: handleGenerate,
            [OPERATION_NAMES.FEEDBACK]: (id: string, feedback: "like" | "dislike" | null) => {
                operationsRef.current.setMessageFeedback(id, feedback)
            },
            [OPERATION_NAMES.SWITCH_VERSION]: (id: string, direction: "prev" | "next") => {
                operationsRef.current.switchMessageVersion(id, direction)
            },
            [OPERATION_NAMES.QUESTION_SELECT]: handleSend,
            [OPERATION_NAMES.SUGGESTION_SELECT]: handleSend,
            [OPERATION_NAMES.EDIT_MESSAGE]: handleEditMessage
        })

        return () => {
            clearOperations()
        }
    }, [registerOperations, clearOperations])

    // 面板首次打开时若无 activeConversation 则自动创建
    useEffect(() => {
        if (visible && !activeConversationId) {
            createConversation()
        }
    }, [visible, activeConversationId, createConversation])

    // 处理 FAQ 点击
    const handleQuestionSelect = useCallback((question: QuestionItem) => {
        const handleSend = operationsRef.current.sendMessage
        handleSend(question.prompt, REQUEST_OPTIONS)
    }, [])

    // 使用当前预设的 FAQ
    const currentFaq = useMemo(() => {
        if (agentPresets.length === 0) return WELCOME_QUESTIONS
        return agentPresets[0]?.faq || WELCOME_QUESTIONS
    }, [agentPresets])

    // 无消息时显示欢迎页
    const showWelcome = messages.length === 0

    if (!visible) return null

    // 显示历史记录
    if (showHistory) {
        return (
            <div
                className={cn(
                    "fixed bottom-20 right-6 w-96 h-[600px] rounded-2xl shadow-2xl border bg-background",
                    "flex flex-col overflow-hidden transition-all duration-300",
                    !isHydrated && "opacity-0"
                )}
            >
                {/* 顶部标题栏 */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        <div>
                            <h3 className="text-sm font-medium">历史记录</h3>
                            <p className="text-xs text-muted-foreground">查看历史对话</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                                createConversation()
                                setShowHistory(false)
                                onNewChat?.()
                            }}
                            title="新建对话"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setShowHistory(false)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* 会话列表 */}
                <ConversationList
                    conversations={conversations}
                    activeId={activeConversationId}
                    onSelect={(id) => {
                        setActiveConversation(id)
                        setShowHistory(false)
                    }}
                    onCreate={() => {
                        createConversation()
                        setShowHistory(false)
                        onNewChat?.()
                    }}
                    onDelete={deleteConversation}
                    onRename={renameConversation}
                    hideHeader
                />
            </div>
        )
    }

    return (
        <div
            className={cn(
                "fixed bottom-20 right-6 w-96 h-[600px] rounded-2xl shadow-2xl border bg-background",
                "flex flex-col overflow-hidden transition-all duration-300",
                !isHydrated && "opacity-0"
            )}
        >
            {/* 顶部标题栏 */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    <div>
                        <h3 className="text-sm font-medium">AI 助手</h3>
                    </div>
                    {/* Provider 切换下拉菜单 */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                                {PROVIDER_OPTIONS.find((p) => p.value === provider)?.label ||
                                    "Mock"}
                                <ChevronDown className="w-3 h-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {PROVIDER_OPTIONS.map((option) => (
                                <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => setProvider(option.value)}
                                    className="text-xs"
                                >
                                    {option.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex items-center gap-1">
                    {/* 历史记录按钮 */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowHistory(true)}
                        title="历史记录"
                    >
                        <History className="w-4 h-4" />
                    </Button>
                    {/* 新建对话按钮 */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                            createConversation()
                            onNewChat?.()
                        }}
                        title="新建对话"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                    </Button>
                    {/* 关闭按钮 */}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 flex flex-col min-h-0">
                {showWelcome ? (
                    // 欢迎页
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Bot className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-lg font-semibold mb-2">您好！我是您的 AI 助手</h2>
                            <p className="text-sm text-muted-foreground">
                                {agentPresets[0]?.description || "有什么可以帮您的吗？"}
                            </p>
                        </div>

                        {/* FAQ 快捷入口 */}
                        {currentFaq.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MessageSquare className="w-4 h-4" />
                                    <span>常见问题</span>
                                </div>
                                <div className="space-y-2">
                                    {currentFaq.map((question, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleQuestionSelect(question)}
                                            className={cn(
                                                "w-full text-left p-3 rounded-lg border bg-card hover:bg-accent/50",
                                                "transition-colors text-sm"
                                            )}
                                        >
                                            <span className="mr-2">{question.icon}</span>
                                            {question.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // 消息列表
                    <MessageList
                        messages={messages}
                        isStreaming={isStreaming}
                        welcomeQuestions={WELCOME_QUESTIONS}
                        suggestions={DEFAULT_SUGGESTIONS}
                        suggestionMode="dropdown"
                        compact
                    />
                )}

                {/* 输入框区域 */}
                <div className="shrink-0 border-t bg-background">
                    <ChatInput
                        onAbort={abortStream}
                        isStreaming={isStreaming}
                        shortcuts={MOCK_SHORTCUTS}
                        pendingFiles={pendingFiles}
                        onAddFiles={addFiles}
                        onRemoveFile={removeFile}
                        onClearFiles={clearFiles}
                        getReadyFiles={getReadyFiles}
                    />
                </div>
            </div>
        </div>
    )
}
