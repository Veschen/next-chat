'use client'
import React, { useCallback, useState } from 'react'
import { Copy, Check, ThumbsUp, RefreshCw, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ChatMessage } from '@/lib/use-chat'

interface MessageActionsProps {
    message: ChatMessage
    isLastAssistant: boolean
    onGenerate: () => void
    onFeedback: (id: string, feedback: 'like' | 'dislike' | null) => void
}

export function MessageActions({ message, isLastAssistant, onGenerate, onFeedback }: MessageActionsProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(message.content)
        setCopied(true)
        setTimeout(() => {
            setCopied(false)
        }, 2000)
    }, [message.content])

    const handleLike = useCallback(() => {
        onFeedback(message.id, 'like')
    }, [message.id, onFeedback])

    const handleDislike = useCallback(() => {
        onFeedback(message.id, 'dislike')
    }, [message.id, onFeedback])

    return (
        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* 复制 */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex">
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
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        {copied ? '已复制' : '复制'}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            {/* 点赞 */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex">
                            <Button onClick={handleLike} variant="ghost" size="icon" className="w-7 h-7">
                                <ThumbsUp className={cn('w-3.5 h-3.5', message.feedback === 'like' ? 'text-emerald-500 fill-emerald-500' : 'text-muted-foreground')} />
                            </Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        有帮助
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            {/* 点踩 */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex">
                            <Button onClick={handleDislike} variant="ghost" size="icon" className="w-7 h-7">
                                <ThumbsDown className={cn('w-3.5 h-3.5', message.feedback === 'dislike' ? 'text-red-500 fill-red-500' : 'text-muted-foreground')} />
                            </Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        没帮助
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* 重新生成，仅最后一条消息生效 */}
            {isLastAssistant && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex">
                                <Button onClick={onGenerate} variant="ghost" size="icon" className="w-7 h-7">
                                    <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            重新生成
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    )
}
