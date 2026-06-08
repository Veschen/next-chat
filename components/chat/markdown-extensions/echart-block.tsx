'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'

interface EChartBlockProps {
    content: string
}

const RENDER_DEBOUNCE_MS = 300

export function EChartBlock({ content }: EChartBlockProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastRenderedContentRef = useRef<string>('')

    const renderChart = useCallback(async (chartConfig: string, cancelled: { current: boolean }) => {
        try {
            setLoading(true)
            setError(null)

            const echarts = await import('echarts')
            const cleanConfig = chartConfig.replace(/[`\s]+$/g, '')

            let option: any
            try {
                option = JSON.parse(cleanConfig)
            } catch {
                try {
                    const configFn = new Function(`return ${cleanConfig}`)
                    option = configFn()
                } catch (parseErr) {
                    throw new Error(`配置解析失败: ${parseErr instanceof Error ? parseErr.message : '未知错误'}`)
                }
            }

            if (!containerRef.current || cancelled.current) {
                return
            }

            if (chartRef.current) {
                chartRef.current.dispose()
                chartRef.current = null
            }

            chartRef.current = echarts.init(containerRef.current)
            chartRef.current.setOption(option)
            lastRenderedContentRef.current = chartConfig

            const handleResize = () => {
                chartRef.current?.resize()
            }
            window.addEventListener('resize', handleResize)

            if (!cancelled.current) {
                (cancelled as any).handleResize = handleResize
                setLoading(false)
            }

        } catch (err) {
            if (cancelled.current) return
            const errMsg = err instanceof Error ? err.message : '未知错误'
            console.warn(`渲染 EChart 图表失败: ${errMsg}`)
            setError(errMsg)
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!content || !containerRef.current) return
        if (content === lastRenderedContentRef.current) return

        const cancelled = { current: false }

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        setError(null)
        setLoading(true)

        debounceTimerRef.current = setTimeout(() => {
            renderChart(content, cancelled)
        }, RENDER_DEBOUNCE_MS)

        return () => {
            cancelled.current = true
            if ((cancelled as any).handleResize) {
                window.removeEventListener('resize', (cancelled as any).handleResize)
            }
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
                debounceTimerRef.current = null
            }
            if (chartRef.current) {
                chartRef.current.dispose()
                chartRef.current = null
            }
        }
    }, [content, renderChart])

    if (error) {
        return (
            <div className="my-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                <p className="text-red-600 dark:text-red-400 text-xs mb-1">渲染 EChart 图表失败: {error}</p>
                <pre className="text-red-500 text-xs whitespace-pre-wrap max-h-40 overflow-auto">{content}</pre>
            </div>
        )
    }

    return (
        <div className="my-3 overflow-x-auto rounded-lg border border-border bg-muted/30 p-4">
            {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>渲染图表中...</span>
                </div>
            )}
            <div
                ref={containerRef}
                className={loading ? 'hidden' : ''}
                style={{ minHeight: '300px', width: '100%' }}
            />
        </div>
    )
}
