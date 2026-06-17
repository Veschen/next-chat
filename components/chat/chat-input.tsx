"use client"

import React, { useCallback, useEffect, useRef, useMemo, useState } from "react"
import { SendHorizonal, Square, Paperclip, X } from "lucide-react"
import { Button } from "../ui/button"
import { cn } from "@/lib/utils"
import { ShortcutList } from "./shortcut-list"
import { Attachments } from "./attachments"
import { useChatStore } from "@/lib/store"
import { OPERATION_NAMES } from "@/lib/store/operation-slice"
import type { ShortcutItem } from "@/lib/types"
import type { UploadingFile, FileItem } from "@/lib/store/types"

interface ChatInputProps {
    onAbort: () => void
    isStreaming: boolean
    disabled?: boolean
    shortcuts?: ShortcutItem[]
    pendingFiles: UploadingFile[]
    onAddFiles: (files: File[]) => void
    onRemoveFile: (uid: string) => void
    onClearFiles: () => void
    getReadyFiles: () => FileItem[]
}

export function ChatInput({
    onAbort,
    isStreaming,
    disabled,
    shortcuts = [],
    pendingFiles,
    onAddFiles,
    onRemoveFile,
    onClearFiles,
    getReadyFiles
}: ChatInputProps) {
    const [value, setValue] = useState("")
    const [shortcutOpen, setShortcutOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const [showAttachments, setShowAttachments] = useState(false)
    const [isDragging, setIsDragging] = useState(false)

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const isComposingRef = useRef(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // 使用 ref 存储高频变化的依赖，避免 useCallback 频繁重建
    const valueRef = useRef(value)
    const hasFilesRef = useRef(pendingFiles.length > 0)
    const isStreamingRef = useRef(isStreaming)
    const disabledRef = useRef(disabled)

    // 同步 ref 值
    useEffect(() => {
        valueRef.current = value
    }, [value])

    useEffect(() => {
        hasFilesRef.current = pendingFiles.length > 0
    }, [pendingFiles])

    useEffect(() => {
        isStreamingRef.current = isStreaming
    }, [isStreaming])

    useEffect(() => {
        disabledRef.current = disabled
    }, [disabled])

    const hasFiles = pendingFiles.length > 0

    const filteredShortcuts = useMemo(() => {
        if (!shortcutOpen || shortcuts.length === 0) return []

        const slashIndex = value.lastIndexOf("/")
        if (slashIndex === -1) return shortcuts

        const keyword = value.slice(slashIndex + 1).toLowerCase()
        if (!keyword) return shortcuts

        return shortcuts.filter(
            (item) =>
                item.label.toLowerCase().includes(keyword) ||
                item.description.toLowerCase().includes(keyword)
        )
    }, [shortcuts, value, shortcutOpen])

    const handleShortcutSelect = useCallback((item: ShortcutItem) => {
        setValue(item.prompt)
        setShortcutOpen(false)
        setActiveIndex(0)
        textareaRef.current?.focus()
    }, [])

    const handleSend = useCallback(() => {
        const trimmedValue = valueRef.current.trim()
        const currentHasFiles = hasFilesRef.current
        const currentIsStreaming = isStreamingRef.current
        const currentDisabled = disabledRef.current

        if (!trimmedValue && !currentHasFiles) return
        if (currentIsStreaming || currentDisabled) return

        const readyFiles = currentHasFiles ? getReadyFiles() : undefined
        const sendContent = trimmedValue || (currentHasFiles ? "请分析以下文件" : "")

        // 使用 getState() 获取最新的 operationsMap，避免订阅导致的重渲染
        useChatStore
            .getState()
            .operationsMap[OPERATION_NAMES.SEND_MESSAGE]?.(sendContent, readyFiles)

        setValue("")
        setShortcutOpen(false)
        setShowAttachments(false)
        onClearFiles()

        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
        }
    }, [getReadyFiles, onClearFiles])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (shortcutOpen && filteredShortcuts.length > 0) {
                if (e.key === "ArrowUp") {
                    e.preventDefault()
                    setActiveIndex((prevIndex) =>
                        prevIndex <= 0 ? filteredShortcuts.length - 1 : prevIndex - 1
                    )
                    return
                }
                if (e.key === "ArrowDown") {
                    e.preventDefault()
                    setActiveIndex((prevIndex) =>
                        prevIndex >= filteredShortcuts.length - 1 ? 0 : prevIndex + 1
                    )
                    return
                }

                if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
                    e.preventDefault()
                    handleShortcutSelect(filteredShortcuts[activeIndex])
                    return
                }
                if (e.key === "Escape") {
                    e.preventDefault()
                    setShortcutOpen(false)
                    return
                }
            }

            if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
                e.preventDefault()
                handleSend()
            }
        },
        [handleSend, shortcutOpen, filteredShortcuts, activeIndex, handleShortcutSelect]
    )

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newValue = e.target.value
            setValue(newValue)

            if (shortcuts.length > 0) {
                const trimmedValue = newValue.trimStart()
                if (trimmedValue.startsWith("/")) {
                    setShortcutOpen(true)
                    setActiveIndex(0)
                } else {
                    setShortcutOpen(false)
                }
            }
        },
        [shortcuts]
    )

    const handleAttachClick = useCallback(() => {
        if (disabled || isStreaming) return
        if (hasFiles) {
            setShowAttachments((prev) => !prev)
        } else {
            fileInputRef.current?.click()
        }
    }, [disabled, isStreaming, hasFiles])

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const selectedFiles = Array.from(e.target.files || [])
            if (selectedFiles.length > 0) {
                onAddFiles(selectedFiles)
            }
            e.target.value = ""
        },
        [onAddFiles]
    )

    const handlePaste = useCallback(
        (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
            const items = e.clipboardData.items
            const files: File[] = []

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith("image/")) {
                    const file = items[i].getAsFile()
                    if (file) files.push(file)
                }
            }

            if (files.length > 0) {
                e.preventDefault()
                onAddFiles(files)
            }
        },
        [onAddFiles]
    )

    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        textarea.style.height = "auto"
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }, [value])

    useEffect(() => {
        if (!shortcutOpen) return

        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShortcutOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [shortcutOpen])

    // 拖拽上传相关事件处理
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragging(false)

            if (disabled || isStreaming) return

            const droppedFiles = Array.from(e.dataTransfer.files)
            if (droppedFiles.length > 0) {
                onAddFiles(droppedFiles)
            }
        },
        [disabled, isStreaming, onAddFiles]
    )

    return (
        <div className="border-t bg-background px-4 py-3">
            <div className="max-w-3xl mx-auto">
                <div className="relative" ref={containerRef}>
                    <ShortcutList
                        items={filteredShortcuts}
                        visible={shortcutOpen}
                        activeIndex={activeIndex}
                        onSelect={handleShortcutSelect}
                    />

                    {/* 附件面板 */}
                    {showAttachments && hasFiles && (
                        <div className="mb-3 rounded-xl border bg-background p-3 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium">
                                    已添加 {pendingFiles.length} 个文件
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClearFiles}
                                    className="h-6"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    清空
                                </Button>
                            </div>
                            <Attachments
                                files={pendingFiles}
                                onAddFiles={onAddFiles}
                                onRemoveFile={onRemoveFile}
                                accept="image/*,.pdf,.doc,.docx,.txt,.md"
                                maxCount={5}
                                disabled={isStreaming}
                            />
                        </div>
                    )}

                    <div
                        className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {/* 附件按钮 */}
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleAttachClick}
                            disabled={disabled || isStreaming}
                            className={cn(
                                "h-9 w-9 shrink-0 rounded-xl",
                                hasFiles ? "relative" : ""
                            )}
                        >
                            <Paperclip className="w-4 h-4" />
                            {hasFiles && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                                    {pendingFiles.length}
                                </span>
                            )}
                        </Button>

                        {/* 文件选择隐藏 input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,.pdf,.doc,.docx,.txt,.md"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={disabled || isStreaming}
                        />

                        <textarea
                            className={cn(
                                "flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
                                "min-h-[36px] max-h-[200px]"
                            )}
                            ref={textareaRef}
                            value={value}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            onCompositionStart={() => (isComposingRef.current = true)}
                            onCompositionEnd={() => (isComposingRef.current = false)}
                            onPaste={handlePaste}
                            placeholder="输入消息，按 / 使用快捷指令"
                            disabled={disabled}
                            rows={1}
                        />
                        {isStreaming ? (
                            <Button
                                size="icon"
                                variant="destructive"
                                onClick={onAbort}
                                className="h-9 w-9 shrink-0 rounded-xl"
                            >
                                <Square className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                size="icon"
                                onClick={handleSend}
                                disabled={(!value.trim() && !hasFiles) || disabled}
                                className="h-9 w-9 shrink-0 rounded-xl"
                            >
                                <SendHorizonal />
                            </Button>
                        )}
                    </div>

                    {/* 拖拽提示 */}
                    {isDragging && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-primary bg-primary/10 pointer-events-none">
                            <p className="text-sm font-medium text-primary">松开以上传文件</p>
                        </div>
                    )}
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                    AI 生成内容仅供参考
                </p>
            </div>
        </div>
    )
}
