'use client'

import React, { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { Button } from '../ui/button'
import { useChatStore } from '@/lib/use-chat'
import { ConversationList } from './conversation-list'
import { ChatInput } from './chat-input'
import { MessageList } from './message-list'
import type { CRequestOptions } from '@/lib/request'

const REQUEST_OPTIONS: CRequestOptions = {
    baseURL: '/api/chat',
    timeout: 30_000,
    streamTimeout: 15_000,
}

export function ChatLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true)

    const conversations = useChatStore((state) => state.conversations)
    const activeConversationId = useChatStore((state) => state.activeConversationId)
    const isStreaming = useChatStore((state) => state.isStreaming)
    const activeConversation = useChatStore((state) => state.getActiveConversation)
    const createConversation = useChatStore((state) => state.createConversation)
    const setActiveConversation = useChatStore((state) => state.setActiveConversation)
    const deleteConversation = useChatStore((state) => state.deleteConversation)
    const sendMessage = useChatStore((state) => state.sendMessage)
    const abortStream = useChatStore((state) => state.abortStream)

    const currentConversation = activeConversation()
    const messages = currentConversation?.messages ?? []

    const handleSend = useCallback((content: string) => {
        sendMessage(content, REQUEST_OPTIONS)
    }, [sendMessage])

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
                    {
                        isStreaming && <span className="ml-auto text-xs text-muted-foreground animate-pulse">生成中...</span>
                    }
                </div>
                {/* 消息列表 */}
                <MessageList messages={messages} isStreaming={isStreaming} />
                {/* 输入框 */}
                <ChatInput onSend={handleSend} onAbort={abortStream} isStreaming={isStreaming} />
            </div>
        </div>
    )
}
