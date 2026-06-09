'use client'
import { useCallback, useState } from 'react'
import { Copy, Check, ThumbsUp, RefreshCw, ThumbsDown, Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ChatMessage } from '@/lib/store/types'
import { getActiveContent } from '@/lib/store/utils'
import { useChatStore } from '@/lib/store'
import { OPERATION_NAMES } from '@/lib/store/operation-slice'

interface MessageActionsProps {
    message: ChatMessage
    isLastAssistant?: boolean
    isUser?: boolean
    isEditing?: boolean
    editContent?: string
    onEditChange?: (messageId: string | null) => void
    onEditContentChange?: (content: string) => void
    onEditConfirm?: () => void
    onEditCancel?: () => void
}

export function MessageActions({ 
    message, 
    isLastAssistant = false, 
    isUser = false,
    isEditing = false,
    editContent = '',
    onEditChange,
    onEditContentChange,
    onEditConfirm,
    onEditCancel
}: MessageActionsProps) {
    const [copied, setCopied] = useState(false)
    
    const operationsMap = useChatStore((state) => state.operationsMap)
    
    const activeChild = getActiveContent(message)

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(activeChild.content ?? '')
        setCopied(true)
        setTimeout(() => {
            setCopied(false)
        }, 2000)
    }, [activeChild.content])

    const handleLike = useCallback(() => {
        operationsMap[OPERATION_NAMES.FEEDBACK]?.(message.id, 'like')
    }, [message.id, operationsMap])

    const handleDislike = useCallback(() => {
        operationsMap[OPERATION_NAMES.FEEDBACK]?.(message.id, 'dislike')
    }, [message.id, operationsMap])

    const handleGenerate = useCallback(() => {
        operationsMap[OPERATION_NAMES.REGENERATE]?.()
    }, [operationsMap])

    const handleEdit = useCallback(() => {
        // 设置当前消息为编辑状态（自动取消其他消息的编辑状态）
        onEditChange?.(message.id)
    }, [message.id, onEditChange])

    const handleEditConfirm = useCallback(() => {
        // 调用父组件的确认处理（已包含内容变化检查）
        onEditConfirm?.()
    }, [onEditConfirm])

    const handleEditCancel = useCallback(() => {
        onEditCancel?.()
    }, [onEditCancel])

    // 用户消息显示编辑和复制
    if (isUser) {
        return (
            <div className={cn(
                'flex items-center gap-1 mt-1 transition-opacity',
                isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}>
                {/* 非编辑状态：显示编辑和复制 */}
                {!isEditing && (
                    <>
                        <Button
                            onClick={handleEdit}
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                        >
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                            onClick={handleCopy}
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                        >
                            {copied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                        </Button>
                    </>
                )}

                {/* 编辑状态：显示取消和确定 */}
                {isEditing && (
                    <>
                        <Button
                            onClick={handleEditCancel}
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                        >
                            <X className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                        <Button
                            onClick={handleEditConfirm}
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                        >
                            <Check className="h-3.5 w-3.5 text-green-500" />
                        </Button>
                    </>
                )}
            </div>
        )
    }

    // AI 消息显示复制、点赞、点踩和重新生成
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
                                <Button onClick={handleGenerate} variant="ghost" size="icon" className="w-7 h-7">
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
