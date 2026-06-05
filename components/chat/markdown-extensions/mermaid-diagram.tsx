'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'

interface MermaidDiagramProps {
    content: string
}

const RENDER_DEBOUNCE_MS = 300 // 300ms 延迟渲染

let mermaidInitialized = false

export function MermaidDiagram({ content }: MermaidDiagramProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const renderCounterRef = useRef<number>(0)
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastRenderedContentRef = useRef<string>('')

    const renderDiagram = useCallback(async(diagramContent: string, cancelled: { current: boolean }) => {
         try {
                setLoading(true)
                setError(null)
                const mermaid = (await import('mermaid')).default
                if (!mermaidInitialized) {
                    mermaid.initialize({
                        startOnLoad: false,
                        theme: 'default',
                        securityLevel: 'loose',
                        fontFamily: 'ui-sans-serif,system-ui, sans-serif',
                    })
                    mermaidInitialized = true
                }

                // 清除末尾干扰字符,比如反引号、格子等
                const cleanCode = diagramContent.replace(/[`\s]+$/g, '')

                // 每次渲染使用唯一的 ID
                const uniqueId = `mermaid-${Date.now()}-${renderCounterRef.current++}`

                // 移除mermaid可能残留的临时SVG元素
                const staleElement = document.getElementById(uniqueId)
                if (staleElement) {
                    staleElement.remove()
                }

                const { svg } = await mermaid.render(uniqueId, cleanCode)
                if (containerRef.current && !cancelled.current) {
                    containerRef.current.innerHTML = svg
                    lastRenderedContentRef.current = diagramContent
                }
                if (!cancelled.current) setLoading(false)
            } catch (err) {
                if (cancelled.current) return
                const errMsg = err instanceof Error ? err.message : '未知错误'
                console.warn(`渲染 Mermaid 图失败: ${errMsg}`)
                setError(errMsg)
                setLoading(false)
            }
    },[])


    useEffect(() => {
        // 内容为空或容器不存在, 不执行渲染
        if (!content || !containerRef.current) return
        // 内容未改变, 不执行渲染
        if (content === lastRenderedContentRef.current) return

        const cancelled = { current: false }
        
        // 清除之前的渲染定时器
        debounceTimerRef.current && clearTimeout(debounceTimerRef.current)

        // 重置错误状态
        setError(null)
        setLoading(true)

        debounceTimerRef.current = setTimeout(() => {
            renderDiagram(content, cancelled)
        }, RENDER_DEBOUNCE_MS)
        
        return () => {
            cancelled.current = true
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
                debounceTimerRef.current = null
            }
        }
    }, [content, renderDiagram])

    if (error) {
        return (
            <div className="my-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                <p className="text-red-600 dark:text-red-400 text-xs mb-1">渲染 Mermaid 图失败: {error}</p>
                <pre className="text-red-500 text-xs whitespace-pre-wrap">{content}</pre>
            </div>
        )
    }

    return (
        <div className="my-3 overflow-x-auto rounded-lg border border-border bg-muted/30 p-4">
            {
                loading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span>渲染图表中...</span>
                    </div>
                )
            }
            <div ref={containerRef} className={loading ? 'hidden' : ''} />
        </div>
    )
}