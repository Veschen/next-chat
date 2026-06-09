'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { Button } from '../ui/button'
import { Select, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectItem, SelectContent } from '../ui/select'
import { useChatStore } from '@/lib/store'
import { useHydration } from '@/lib/hooks/use-hydration'
import { ConversationList } from './conversation-list'
import { ChatInput } from './chat-input'
import { MessageList } from './message-list'
import type { CRequestOptions } from '@/lib/request'
import type { FileItem } from '@/lib/store/types'
import { REQUEST_OPTIONS, PROVIDER_OPTIONS, MOCK_SHORTCUTS, WELCOME_QUESTIONS, DEFAULT_SUGGESTIONS } from '@/lib/constants'
import { OPERATION_NAMES } from '@/lib/store/operation-slice'

export function ChatLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [provider, setProvider] = useState('mock')
    const isHydrated = useHydration()

    const requestOptions: CRequestOptions = useMemo(() => ({
        ...REQUEST_OPTIONS,
        baseURL: `/api/chat?provider=${provider}`,
    }), [provider])

    const conversations = useChatStore((state) => state.conversations)
    const activeConversationId = useChatStore((state) => state.activeConversationId)
    const isStreaming = useChatStore((state) => state.isStreaming)
    const activeConversation = useChatStore((state) => state.getActiveConversation)
    const createConversation = useChatStore((state) => state.createConversation)
    const setActiveConversation = useChatStore((state) => state.setActiveConversation)
    const deleteConversation = useChatStore((state) => state.deleteConversation)
    const renameConversation = useChatStore((state) => state.renameConversation)
    const sendMessage = useChatStore((state) => state.sendMessage)
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

    // 使用 ref 存储最新的回调函数，避免频繁重注册
    const operationsRef = useRef({
        sendMessage,
        setMessageFeedback,
        regenerateLastMessage,
        switchMessageVersion,
        editMessage,
        requestOptions,
    })
    
    // 每次渲染时更新 ref
    operationsRef.current = {
        sendMessage,
        setMessageFeedback,
        regenerateLastMessage,
        switchMessageVersion,
        editMessage,
        requestOptions,
    }

    // 注册全局操作（只执行一次）
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
            // 编辑消息，删除该消息之后的所有消息
            editMessage(messageId, newContent)
            // 自动重新发送
            sendMessage(newContent, requestOptions)
        }

        registerOperations({
            [OPERATION_NAMES.SEND_MESSAGE]: handleSend,
            [OPERATION_NAMES.REGENERATE]: handleGenerate,
            [OPERATION_NAMES.FEEDBACK]: (id: string, feedback: 'like' | 'dislike' | null) => {
                operationsRef.current.setMessageFeedback(id, feedback)
            },
            [OPERATION_NAMES.SWITCH_VERSION]: (id: string, direction: 'prev' | 'next') => {
                operationsRef.current.switchMessageVersion(id, direction)
            },
            [OPERATION_NAMES.QUESTION_SELECT]: handleSend,
            [OPERATION_NAMES.SUGGESTION_SELECT]: handleSend,
            [OPERATION_NAMES.EDIT_MESSAGE]: handleEditMessage,
        })

        return () => {
            clearOperations()
        }
    }, [registerOperations, clearOperations])

    // 水合完成前显示默认标题，避免 hydration mismatch
    const title = isHydrated 
        ? (currentConversation?.title ?? '新对话')
        : '新对话'

    return (
        <div className="flex h-screen overflow-hidden">
            {/* 侧边栏 */}
            <div className={cn('border-r transition-all duration-300 ease-in-out overflow-hidden', sidebarOpen ? 'w-64' : 'w-0')}>
                <div className="w-64 h-full">
                    <ConversationList
                        conversations={conversations}
                        activeId={activeConversationId}
                        onSelect={setActiveConversation}
                        onCreate={createConversation}
                        onDelete={deleteConversation}
                        onRename={renameConversation}
                    />
                </div>
            </div>
            {/* 主内容区域 */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
                {/* 顶栏 */}
                <div className="flex items-center gap-2 border-b px-4 py-2 shrink-0">
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setSidebarOpen((prev) => !prev)}>
                        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                    </Button>
                    <h1 className="text-sm font-medium truncate">
                        {title}
                    </h1>
                    <div className="flex items-center gap-3">
                        {
                            isStreaming && <span className="text-xs text-muted-foreground animate-pulse">生成中...</span>
                        }
                    </div>

                    <div className="w-32">
                        <Select value={provider} onValueChange={setProvider}>
                            <SelectTrigger className="w-full max-w-48">
                                <SelectValue placeholder="选择模型" />
                            </SelectTrigger>
                            <SelectContent className="bg-background">
                                <SelectGroup>
                                    <SelectLabel>请选择模型</SelectLabel>
                                    {PROVIDER_OPTIONS.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {/* 消息列表 - 不再传递回调，通过全局操作注册 */}
                <MessageList
                    messages={messages}
                    isStreaming={isStreaming}
                    welcomeQuestions={WELCOME_QUESTIONS}
                    suggestions={DEFAULT_SUGGESTIONS}
                />
                {/* 输入框 - 不再传递回调，通过全局操作注册 */}
                <ChatInput
                    onAbort={abortStream}
                    isStreaming={isStreaming}
                    shortcuts={provider === 'mock' ? MOCK_SHORTCUTS : []}
                    pendingFiles={pendingFiles}
                    onAddFiles={addFiles}
                    onRemoveFile={removeFile}
                    onClearFiles={clearFiles}
                    getReadyFiles={getReadyFiles}
                />
            </div>
        </div>
    )
}
