'use client'

import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import { SendHorizonal, Square } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'
import { ShortcutList } from './shortcut-list'
import type { ShortcutItem } from '@/lib/types'

interface ChatInputProps {
    onSend: (content: string) => void
    onAbort: () => void
    isStreaming: boolean
    disabled?: boolean
    shortcuts?: ShortcutItem[]
}

export function ChatInput({ onSend, onAbort, isStreaming, disabled, shortcuts = [] }: ChatInputProps) {
    const [value, setValue] = useState('')
    const [shortcutOpen, setShortcutOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const isComposingRef = useRef(false)

    const filteredShortcuts = useMemo(() => {
        if (!shortcutOpen || shortcuts.length === 0) return []

        const slashIndex = value.lastIndexOf('/')
        if (slashIndex === -1) return shortcuts

        const keyword = value.slice(slashIndex + 1).toLowerCase()
        if (!keyword) return shortcuts

        return shortcuts.filter(
            item => item.label.toLowerCase().includes(keyword) || item.description.toLowerCase().includes(keyword)
        )
    }, [shortcuts, value, shortcutOpen])

    const handleShortcutSelect = useCallback((item: ShortcutItem) => {
        setValue(item.prompt)
        setShortcutOpen(false)
        setActiveIndex(0)
        textareaRef.current?.focus()
    }, [])

    const handleSend = useCallback(() => {
        const trimmedValue = value.trim()
        if (!trimmedValue || isStreaming || disabled) return
        onSend(trimmedValue)
        // 输入法的回车和发送消息的回车会冲突
        setValue('')
        setShortcutOpen(false)

        // 重置高度
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
        }
    }, [isStreaming, onSend, value, disabled])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // 快捷指令浮层内的键盘导航
        if (shortcutOpen && filteredShortcuts.length > 0) {
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex(prevIndex => prevIndex <= 0 ? filteredShortcuts.length - 1 : prevIndex - 1)
                return
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIndex(prevIndex => prevIndex >= filteredShortcuts.length - 1 ? 0 : prevIndex + 1)
                return
            }

            if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
                e.preventDefault()
                handleShortcutSelect(filteredShortcuts[activeIndex])
                return
            }
            if (e.key === 'Escape') {
                e.preventDefault()
                setShortcutOpen(false)
                return
            }
        }

        if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
            e.preventDefault()
            handleSend()
        }
    }, [handleSend, shortcutOpen, filteredShortcuts, activeIndex, handleShortcutSelect])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value
        setValue(newValue)

        // 检测是否触发了快捷指令
        if (shortcuts.length > 0) {
            const trimmedValue = newValue.trimStart()
            if (trimmedValue.startsWith('/')) {
                setShortcutOpen(true)
                setActiveIndex(0)
            } else {
                setShortcutOpen(false)
            }
        }
    }, [shortcuts])

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
                <div className="relative">
                    <ShortcutList items={filteredShortcuts} visible={shortcutOpen} activeIndex={activeIndex} onSelect={handleShortcutSelect} />
                    <div className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
                        <textarea
                            className={cn('flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
                                'min-h-[36px],max-h-[200px]'
                            )}
                            ref={textareaRef}
                            value={value}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            onCompositionStart={() => isComposingRef.current = true}
                            onCompositionEnd={() => isComposingRef.current = false}
                            placeholder="输入消息，按 / 使用快捷指令"
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
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                    AI 生成内容仅供参考
                </p>
            </div>
        </div>
    )
}