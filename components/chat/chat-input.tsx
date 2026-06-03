'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { SendHorizonal, Square } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'

interface ChatInputProps {
    onSend: (content: string) => void
    onAbort: () => void
    isStreaming: boolean
    disabled?: boolean
}

export function ChatInput({ onSend, onAbort, isStreaming, disabled }: ChatInputProps) {
    const [value, setValue] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const isComposingRef = useRef(false)

    const handleSend = useCallback(() => {
        const trimmedValue = value.trim()
        if (!trimmedValue || isStreaming || disabled) return
        onSend(trimmedValue)
        // 输入法的回车和发送消息的回车会冲突
        setValue('')

        // 重置高度
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
        }
    }, [isStreaming, onSend, value, disabled])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
            e.preventDefault()
            handleSend()
        }
    }, [handleSend])

    // 自动调整高度
    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        textarea.style.height = 'auto'
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }, [value])


    return (
        <div className="border-t bg-background px-4 py-3">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
                    <textarea
                        className={cn('flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
                            'min-h-[36px],max-h-[200px]'
                        )}
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onCompositionStart={() => isComposingRef.current = true}
                        onCompositionEnd={() => isComposingRef.current = false}
                        placeholder="请输入,按Enter发送,按Shift+Enter换行"
                        disabled={disabled}
                        rows={1}
                    />
                    {
                        isStreaming ? (
                            <Button size="icon" variant="destructive" onClick={onAbort} className="h-9 w-9 shrink-0 rounder-xl">
                                <Square className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button size="icon" onClick={handleSend} disabled={!value.trim() || disabled} className="h-9 w-9 shrink-0 rounder-xl">
                                <SendHorizonal />
                            </Button>
                        )
                    }
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                    AI 生成内容仅供参考
                </p>
            </div>
        </div>
    )
}