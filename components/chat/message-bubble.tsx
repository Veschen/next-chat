'use client'

import React from 'react'
import { User, Bot, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MarkdownRender } from './markdown-render'
import type { ChatMessage } from '@/lib/use-chat'
import { MessageActions } from './message-actions'

interface MessageBubbleProps {
    message: ChatMessage
    isLastAssistant: boolean
    onGenerate: () => void
    onFeedback: (id: string, feedback: 'like' | 'dislike'| null) => void
}

export function MessageBubble({ message, isLastAssistant = false, onGenerate, onFeedback }: MessageBubbleProps) {
    const isUser = message.role === 'user'

    return (
        <div
            className={cn('flex group gap-3 px-4 py-3',
                isUser ? 'flex-row-reverse' : 'flex-row'
            )}
        >
            {/* 头像 */}
            <Avatar className={cn('mt-0.5', isUser ? 'bg-primary' : 'bg-emerald-500')}>
                <AvatarFallback
                    className={cn(isUser ? 'bg-primary text-primary-foreground' : 'bg-emerald-500 text-white')}>
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </AvatarFallback>
            </Avatar>
            {/* 消息内容 */}
            <div className={cn('flex flex-col max-w-[75%]', isUser ? 'items-end' : 'items-start')}>
                <div
                    className={cn('rounded-2xl px-4 py-2.5',
                        isUser ? 'bg-primary text-primary-foreground rounded-tr-md' : 'bg-muted rounded-tl-md')}
                >
                    {
                        isUser ? (
                            <p className="text-sm leading-7 whitespace-pre-wrap">
                                {message.content}
                            </p>
                        ) : message.loading && !message.content ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                                <Loader2 className="animate-spin h-4 w-4" />
                                思考中...
                            </div>
                        ) : (
                            <MarkdownRender content={message.content} />
                        )
                    }
                </div>
                {/* 操作按钮 */}
            {
                !isUser && message.content && (
                    <MessageActions
                        message={message}
                        isLastAssistant={isLastAssistant}
                        onGenerate={onGenerate}
                        onFeedback={onFeedback}
                    />
                )
            }
            </div>
        </div>
    )
}