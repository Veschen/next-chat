'use client'

import React, { useCallback, useState } from 'react'
import { Copy, Check, User, Bot, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MarkdownRender } from './markdown-render'
import type { ChatMessage } from '@/lib/use-chat'

interface MessageBubbleProps {
    message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user'
    const [copied, setCopied] = useState(false)

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(message.content)
        setCopied(true)
        setTimeout(() => {
            setCopied(false)
        }, 2000)
    }, [message.content])

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
            </div>
            {/* 操作按钮 */}
            {
                isUser && message.content && (
                    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={handleCopy}
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                    >
                                        {copied
                                            ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {copied ? '已复制' : '复制'}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )
            }
        </div>
    )
}