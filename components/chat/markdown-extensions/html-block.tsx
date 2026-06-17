"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { Code, Maximize2, Minimize2, Copy, Check } from "lucide-react"

interface HTMLBlockProps {
    content: string
}

const RENDER_DEBOUNCE_MS = 300

export function HTMLBlock({ content }: HTMLBlockProps) {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [viewMode, setViewMode] = useState<"preview" | "code">("preview")
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [copied, setCopied] = useState(false)
    const [highlightedCode, setHighlightedCode] = useState("")
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastRenderedContentRef = useRef<string>("")

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [content])

    useEffect(() => {
        if (!content) {
            setError("HTML 内容为空")
            setLoading(false)
            return
        }

        if (content === lastRenderedContentRef.current) {
            setLoading(false)
            return
        }

        const cancelled = { current: false }

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        setError(null)
        setLoading(true)

        debounceTimerRef.current = setTimeout(async () => {
            try {
                // 简单验证 HTML 格式
                const trimmedContent = content.trim()
                if (!trimmedContent.startsWith("<")) {
                    throw new Error("无效的 HTML 格式")
                }

                // 使用 highlight.js 高亮 HTML 代码
                try {
                    const hljs = await import("highlight.js")
                    await import("highlight.js/lib/languages/xml")
                    const result = hljs.default.highlight(content, { language: "xml" })
                    // 为中文文本添加高亮样式，确保可读性
                    const enhancedResult = result.value.replace(
                        /(<[^>]*>)([\u4e00-\u9fa5]+)(<\/[^>]*>)/g,
                        '$1<span style="color: #f8f8f2;">$2</span>$3'
                    )
                    setHighlightedCode(enhancedResult)
                } catch {
                    // 如果 highlight.js 加载失败，使用原始文本
                    setHighlightedCode(content)
                }

                lastRenderedContentRef.current = content
                setLoading(false)
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : "未知错误"
                console.warn(`渲染 HTML 失败: ${errMsg}`)
                setError(errMsg)
                setLoading(false)
            }
        }, RENDER_DEBOUNCE_MS)

        return () => {
            cancelled.current = true
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
                debounceTimerRef.current = null
            }
        }
    }, [content])

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isFullscreen) {
                setIsFullscreen(false)
            }
        }
        window.addEventListener("keydown", handleEscape)
        return () => window.removeEventListener("keydown", handleEscape)
    }, [isFullscreen])

    if (error) {
        return (
            <div className="my-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                <p className="text-red-600 dark:text-red-400 text-xs mb-1">
                    渲染 HTML 失败: {error}
                </p>
                <pre className="text-red-500 text-xs whitespace-pre-wrap max-h-40 overflow-auto">
                    {content}
                </pre>
            </div>
        )
    }

    return (
        <>
            {/* 全屏预览模式 */}
            {isFullscreen && (
                <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <span className="text-white text-sm">HTML 全屏预览</span>
                        <button
                            onClick={() => setIsFullscreen(false)}
                            className="text-white/70 hover:text-white transition-colors p-2"
                        >
                            <Minimize2 className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex-1 p-4 overflow-hidden">
                        <iframe
                            srcDoc={content}
                            sandbox="allow-scripts allow-modals"
                            className="w-full h-full rounded-lg"
                            title="HTML Preview"
                        />
                    </div>
                </div>
            )}

            {/* 正常模式 */}
            <div className="my-3 rounded-lg border border-border bg-muted/30 overflow-hidden">
                {/* 工具栏 */}
                <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewMode("preview")}
                            className={`px-3 py-1 text-xs rounded transition-colors ${
                                viewMode === "preview"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                            预览
                        </button>
                        <button
                            onClick={() => setViewMode("code")}
                            className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                                viewMode === "code"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                            <Code className="h-3 w-3" />
                            代码
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        {viewMode === "preview" && (
                            <button
                                onClick={() => setIsFullscreen(true)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1.5"
                                title="全屏预览 (Esc 退出)"
                            >
                                <Maximize2 className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            onClick={handleCopy}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1.5"
                            title="复制代码"
                        >
                            {copied ? (
                                <Check className="h-4 w-4 text-green-500" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* 内容区域 */}
                <div className="p-4">
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <span>加载中...</span>
                        </div>
                    ) : viewMode === "preview" ? (
                        <div className="min-h-[200px] rounded-lg overflow-hidden border border-border bg-white dark:bg-gray-800">
                            <iframe
                                srcDoc={content}
                                sandbox="allow-scripts allow-modals"
                                className="w-full h-[300px]"
                                title="HTML Preview"
                            />
                        </div>
                    ) : (
                        <div className="bg-zinc-900 rounded-lg overflow-hidden">
                            <div className="px-4 py-2 border-b border-zinc-700 flex items-center justify-between">
                                <span className="text-xs text-zinc-400">HTML</span>
                            </div>
                            <pre className="p-4 text-xs overflow-auto max-h-64 !mb-0">
                                <code
                                    className="whitespace-pre-wrap language-xml hljs"
                                    dangerouslySetInnerHTML={{ __html: highlightedCode || content }}
                                />
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
