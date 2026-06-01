'use client'

import React, { useEffect, useRef } from 'react'
import { MessageCircle } from 'lucide-react'
import { ScrollArea } from '../ui/scroll-area'
import { MessageBubble } from './message-bubble'
import type { ChatMessage } from '../../lib/use-chat'

interface MessageListProps {
    messages: ChatMessage[]
    isStreaming: boolean
    onGenerate: () => void
    onFeedback: (id: string, feedback: 'like' | 'dislike'| null) => void
}

export function MessageList({ messages, isStreaming, onGenerate, onFeedback }: MessageListProps) {
    // 让滚动条自然滚动到最底部
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isStreaming])
    console.log('%c [ messages ]-23', 'font-size:13px; background:pink; color:#bf2c9f;', messages)

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 p-8">
                <div className="rounded-full bg-muted p-4">
                    <MessageCircle className="h-8 w-8" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-medium text-foreground mb-1">开始新对话</h3>
                    <p className="text-sm">在下方输入框输入问题，即可开始对话</p>
                </div>
            </div>
        )
    }

    // 找到最后一条消息的id
    const lastAssistantId = [...messages].reverse().find((msg) => msg.role === 'assistant')?.id

    return (
        <ScrollArea className="flex-1 min-h-0 overflow-hidden">
            <div className="max-w-3xl mx-auto py-4">
                {messages.map((message) => (
                    <MessageBubble 
                    key={message.id} 
                    message={message}
                    isLastAssistant={message.id === lastAssistantId}
                    onGenerate={onGenerate}
                    onFeedback={onFeedback}
                    />
                ))}
                <div ref={bottomRef} />
            </div>
        </ScrollArea>
    )
}