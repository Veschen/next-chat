'use client'

import { useEffect, useRef, useState } from 'react'
import { User, Bot, Loader2, ChevronDown, ChevronRight, ChevronLeft, Brain, FileText, FileImage, FileAudio, FileVideo, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { MarkdownRender } from './markdown-render'
import type { ChatMessage } from '@/lib/store/types'
import { getActiveContent } from '@/lib/store/utils'
import { useChatStore } from '@/lib/store'
import { OPERATION_NAMES } from '@/lib/store/operation-slice'
import { MessageActions } from './message-actions'
import { FileAttachments } from './attachments'

interface MessageBubbleProps {
    message: ChatMessage
    isLastAssistant?: boolean
    isStreaming?: boolean
    /** 是否紧凑模式 */
    compact?: boolean
}



/** 思考过程折叠面板 */
function ThinkingBlock({ thinking, isThinking, thinkingDuration }: { thinking: string, isThinking: boolean, thinkingDuration?: number }) {
    const [isOpen, setIsOpen] = useState(isThinking)

    useEffect(() => {
        if (isThinking) {
            setIsOpen(true)
        }
    }, [isThinking])

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`
        return `${(ms / 1000).toFixed(1)}s`
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-2">
            <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="group/trigger h-auto gap-1.5 px-1 py-1 text-xs text-muted-foreground hover:text-foreground">
                    {isThinking ?
                        (<Loader2 className="animate-spin h-3 w-3" />)
                        : (<Brain className="h-3 w-3" />)
                    }
                    <span>{isThinking ? '思考中...' : '思考过程'}</span>
                    {thinkingDuration && !isThinking && (
                        <span className="text-muted-400">({formatDuration(thinkingDuration)})</span>
                    )}
                    <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=closed]/trigger:hidden" />
                    <ChevronRight className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/trigger:hidden" />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="border-l-2 border-muted-foreground/20 pl-3 mt-1">
                    <MarkdownRender content={thinking} className="text-xs text-muted-foreground leading-5" />
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}

/** 多版本切换器 */
function VersionSwitcher({ message, disabled }: { message: ChatMessage, disabled: boolean }) {
    const operationsMap = useChatStore((state) => state.operationsMap)

    const totalVersions = message.children?.length ?? 0
    if (totalVersions <= 1) return null

    const currentIndex = message.currentIndex

    const handleSwitch = (direction: 'prev' | 'next') => {
        operationsMap[OPERATION_NAMES.SWITCH_VERSION]?.(message.id, direction)
    }

    return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5"
                disabled={disabled || currentIndex === 0}
                onClick={() => handleSwitch('prev')}>
                <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="min-w-[3rem] text-center tabular-nums">
                {currentIndex + 1}/{totalVersions}
            </span>
            <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5"
                disabled={disabled || currentIndex === totalVersions - 1}
                onClick={() => handleSwitch('next')}>
                <ChevronRight className="h-3 w-3" />
            </Button>
        </div>
    )
}

export function MessageBubble({ message, isLastAssistant = false, isStreaming = false, compact = false }: MessageBubbleProps) {
    const isUser = message.role === 'user'
    const activeChild = getActiveContent(message)
    const hasThinking = !isUser && !!activeChild.thinking

    // 使用全局 store 管理编辑状态
    const editingMessageId = useChatStore((state) => state.editingMessageId)
    const setEditContent = useChatStore((state) => state.setEditContent)
    const editContent = useChatStore((state) => state.editContent)
    const sendMessage = useChatStore((state) => state.sendMessage)
    const provider = useChatStore((state) => state.provider)
    const isEditing = editingMessageId === message.id
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    /**
     * 处理卡片按钮点击发送消息
     */
    const handleSendMessage = (content: string) => {
        sendMessage(content, { baseURL: `/api/chat?provider=${provider}` })
    }

    // 当进入编辑模式时，同步内容并聚焦光标
    useEffect(() => {
        if (isEditing) {
            const content = activeChild.content ?? ''
            setEditContent(content)
            // 延迟聚焦，确保 DOM 已更新
            setTimeout(() => {
                const textarea = textareaRef.current
                if (textarea) {
                    textarea.focus()
                    // 将光标定位到文本末尾
                    textarea.setSelectionRange(content.length, content.length)
                }
            }, 0)
        }
    }, [isEditing, activeChild.content, setEditContent])

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
            <div className={cn('flex flex-col min-w-0', 
                compact && !isUser ? 'max-w-[90%]' : 'max-w-[70%]',
                isUser ? 'items-end' : 'items-start', 
                isEditing && (compact ? 'w-[90%]' : 'w-[70%]')
            )}>
                {/* 用户消息中的附件 - 移到气泡上方 */}
                {isUser && activeChild.fileList && activeChild.fileList.length > 0 && (
                    <FileAttachments files={activeChild.fileList} isUser={isUser} />
                )}
                <div
                    className={cn('rounded-2xl px-4 py-2.5 overflow-hidden max-w-full', 
                        isUser
                            ? 'bg-primary text-primary-foreground rounded-tr-md'
                            : 'bg-muted rounded-tl-md',
                        isEditing && 'w-full'
                    )}
                >
                    {
                        isUser ? (
                            <>
                                {isEditing ? (
                                    <textarea
                                        ref={textareaRef}
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className={cn(
                                            'w-full bg-transparent border-none outline-none resize-none',
                                            'text-sm leading-7 whitespace-pre-wrap',
                                            'text-primary-foreground'
                                        )}
                                        style={{ minHeight: '48px' }}
                                    />
                                ) : (
                                    <p className="text-sm leading-7 whitespace-pre-wrap">
                                        {activeChild.content}
                                    </p>
                                )}
                            </>
                        ) : activeChild.loading && !activeChild.content && !hasThinking ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                                <Loader2 className="animate-spin h-4 w-4" />
                                等待响应...
                            </div>
                        ) : (
                            <>
                                {
                                    hasThinking && (
                                        <ThinkingBlock
                                            thinking={activeChild.thinking!}
                                            isThinking={!!activeChild.isThinking}
                                            thinkingDuration={activeChild.thinkingDuration}
                                        />
                                    )
                                }
                                {activeChild.content && <MarkdownRender content={activeChild.content} enabled={isLastAssistant} onSendMessage={handleSendMessage} />}
                                {/* AI 消息中的附件 */}
                                <FileAttachments files={activeChild.fileList ?? []} />
                            </>
                        )
                    }
                </div>

                {/* 消息操作（统一使用 MessageActions） */}
                {activeChild.content && !isStreaming && (
                    <MessageActions
                        message={message}
                        isLastAssistant={isLastAssistant}
                        isUser={isUser}
                    />
                )}

                {/* AI 消息的多版本切换器 */}
                {!isUser && <VersionSwitcher message={message} disabled={isStreaming} />}
            </div>
        </div>
    )
}
