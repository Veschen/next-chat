'use client'

import { useEffect, useRef, useState } from 'react'
import { User, Bot, Loader2, ChevronDown, ChevronRight, ChevronLeft, Brain, FileText, FileImage, FileAudio, FileVideo, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { MarkdownRender } from './markdown-render'
import type { ChatMessage, FileItem } from '@/lib/store/types'
import { getActiveContent } from '@/lib/store/utils'
import { useChatStore } from '@/lib/store'
import { OPERATION_NAMES } from '@/lib/store/operation-slice'
import { MessageActions } from './message-actions'

/** 文件附件组件 */
function FileAttachments({ files, isUser = false }: { files: FileItem[], isUser?: boolean }) {
    if (!files || files.length === 0) return null

    const getFileIcon = (mimeType?: string) => {
        const iconClass = 'w-4 h-4'
        if (!mimeType) return <File className={iconClass} />
        if (mimeType.startsWith('image/')) return <FileImage className={iconClass} />
        if (mimeType.startsWith('audio/')) return <FileAudio className={iconClass} />
        if (mimeType.startsWith('video/')) return <FileVideo className={iconClass} />

        return <FileText className={iconClass} />
    }

    const formatFileSize = (size?: number) => {
        if (!size) return '-'
        if (size < 1024) return `${size} B`
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
        return `${(size / (1024 * 1024)).toFixed(1)} MB`
    }

    const truncateFileName = (name: string, maxLength = 20) => {
        if (name.length <= maxLength) return name
        const extensionIndex = name.lastIndexOf('.')
        if (extensionIndex === -1) return name.slice(0, maxLength) + '...'
        const extension = name.slice(extensionIndex)
        const baseName = name.slice(0, extensionIndex)
        const visibleLength = maxLength - extension.length - 1
        if (visibleLength <= 0) return name.slice(0, maxLength) + '...'
        return baseName.slice(0, visibleLength) + '...' + extension
    }

    const isImageFile = (mimeType?: string) => {
        return mimeType?.startsWith('image/')
    }

    return (
        <div className="mt-2 space-y-1.5">
            {files.map(file => (
                <div
                    key={file.uid}
                    className={cn(
                        'group relative flex items-center gap-2.5 rounded-lg p-2 ',
                        isUser
                            ? 'bg-white/15 text-primary-foreground'
                            : 'bg-background border border-border'
                    )}
                >
                    {/* 图标区 */}
                    <div className={cn(
                        'flex flex-shrink-0 rounded-md overflow-hidden items-center justify-center w-9 h-9',
                        !isImageFile(file.mimeType) && (isUser ? 'bg-white/10' : 'bg-muted')
                    )}>
                        {
                            isImageFile(file.mimeType) && file.url ? (
                                <img src={file.url} alt={file.name} className="w-9 h-9 object-cover rounded-md" />
                            ) : (
                                <span className={isUser ? 'opacity-80' : 'text-muted-foreground'}>
                                    {getFileIcon(file.mimeType)}
                                </span>
                            )
                        }
                    </div>
                    {/* 文件信息 */}
                    <div className=" flex-1 min-w-0">
                        <p className="font-medium truncate text-[13px] leading-tight">{truncateFileName(file.name)}</p>
                        <p className={cn('text-[11px] leading-tight mt-0.5', isUser ? 'opacity-60' : 'text-muted-foreground')}>{formatFileSize(file.size)}</p>
                    </div>

                    {/* hover 展示完整文件名 */}
                    { file.name.length > 20 &&
                        <div className={cn(
                            'absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md z-10',
                            'bg-gray-900 text-white text-xs whitespace-nowrap',
                            'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
                            'after:content-[""] after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2',
                            'after:border-4 after:border-transparent after:border-t-gray-900'
                        )}>
                            {file.name}
                        </div>
                    }

                </div>
            ))}
        </div>
    )
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

interface MessageBubbleProps {
    message: ChatMessage
    isLastAssistant?: boolean
    isStreaming?: boolean
}

export function MessageBubble({ message, isLastAssistant = false, isStreaming = false }: MessageBubbleProps) {
    const isUser = message.role === 'user'
    const activeChild = getActiveContent(message)
    const hasThinking = !isUser && !!activeChild.thinking

    // 使用全局 store 管理编辑状态
    const editingMessageId = useChatStore((state) => state.editingMessageId)
    const setEditingMessageId = useChatStore((state) => state.setEditingMessageId)
    const isEditing = editingMessageId === message.id
    const [editContent, setEditContent] = useState(activeChild.content)
    const [originalContent, setOriginalContent] = useState(activeChild.content)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // 当进入编辑模式时，同步内容并聚焦光标
    useEffect(() => {
        if (isEditing) {
            const content = activeChild.content ?? ''
            setEditContent(content)
            setOriginalContent(content)
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
    }, [isEditing, activeChild.content])

    // 编辑确认处理（检查内容是否变化）
    const handleEditConfirm = () => {
        const newContent = editContent.trim()
        const oldContent = originalContent.trim()
        
        // 如果内容没有变化，直接退出编辑模式
        if (newContent === oldContent) {
            setEditingMessageId(null)
            return
        }

        // 内容有变化，触发编辑操作
        if (newContent) {
            const operationsMap = useChatStore.getState().operationsMap
            operationsMap[OPERATION_NAMES.EDIT_MESSAGE]?.(message.id, newContent)
        }
        setEditingMessageId(null)
    }

    // 编辑取消处理
    const handleEditCancel = () => {
        setEditingMessageId(null)
        setEditContent('')
    }

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
            <div className={cn('flex flex-col max-w-[65%]', isUser ? 'items-end' : 'items-start')}>
                <div
                    className={cn('rounded-2xl px-4 py-2.5',
                        isUser 
                            ? 'bg-primary text-primary-foreground rounded-tr-md' 
                            : 'bg-muted rounded-tl-md'
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
                                {/* 用户消息中的附件 */}
                                {!isEditing && <FileAttachments files={activeChild.fileList ?? []} isUser={isUser} />}
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
                                {activeChild.content && <MarkdownRender content={activeChild.content} />}
                                {/* AI 消息中的附件 */}
                                <FileAttachments files={activeChild.fileList ?? []} />
                            </>
                        )
                    }
                </div>

                {/* 消息操作（统一使用 MessageActions） */}
                {activeChild.content && (
                    <MessageActions
                        message={message}
                        isLastAssistant={isLastAssistant}
                        isUser={isUser}
                        isEditing={isEditing}
                        editContent={editContent}
                        onEditChange={setEditingMessageId}
                        onEditContentChange={setEditContent}
                        onEditConfirm={handleEditConfirm}
                        onEditCancel={handleEditCancel}
                    />
                )}

                {/* AI 消息的多版本切换器 */}
                {!isUser && <VersionSwitcher message={message} disabled={isStreaming} />}
            </div>
        </div>
    )
}
