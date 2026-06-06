'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { Button } from '../ui/button'
import { Select, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectItem, SelectContent } from '../ui/select'
import { useChatStore } from '@/lib/store'
import { ConversationList } from './conversation-list'
import { ChatInput } from './chat-input'
import { MessageList } from './message-list'
import type { CRequestOptions } from '@/lib/request'
import { REQUEST_OPTIONS, PROVIDER_OPTIONS, MOCK_SHORTCUTS, WELCOME_QUESTIONS, DEFAULT_SUGGESTIONS } from '@/lib/constants'


export function ChatLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [provider, setProvider] = useState('mock')

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
    const sendMessage = useChatStore((state) => state.sendMessage)
    const abortStream = useChatStore((state) => state.abortStream)
    const setMessageFeedback = useChatStore((state) => state.setMessageFeedback)
    const regenerateLastMessage = useChatStore((state) => state.regenerateLastMessage)
    const switchMessageVersion = useChatStore((state) => state.switchMessageVersion)

    const currentConversation = activeConversation()
    const messages = currentConversation?.messages ?? []

    const handleSend = useCallback((content: string) => {
        sendMessage(content, requestOptions)
    }, [sendMessage, requestOptions])

    const handleGenerate = useCallback(() => {
        regenerateLastMessage(requestOptions)
    }, [regenerateLastMessage, requestOptions])

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
                        {currentConversation?.title ?? '新对话'}
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
                {/* 消息列表 */}
                <MessageList
                    messages={messages}
                    isStreaming={isStreaming}
                    onGenerate={handleGenerate}
                    onFeedback={setMessageFeedback}
                    onSwitchVersion={switchMessageVersion}
                    welcomeQuestions={WELCOME_QUESTIONS}
                    onQuestionSelect={handleSend}
                    suggestions={DEFAULT_SUGGESTIONS}
                    onSuggestionSelect={handleSend}
                />
                {/* 输入框 */}
                <ChatInput
                    onSend={handleSend}
                    onAbort={abortStream}
                    isStreaming={isStreaming}
                    shortcuts={provider === 'mock' ? MOCK_SHORTCUTS : []}
                />
            </div>
        </div>
    )
}
