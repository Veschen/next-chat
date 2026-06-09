'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseStreamContentOptions {
    /** 原始内容 持续增长 */
    content: string
    /** 消息是否已结束流式输出 */
    isMessageEnd: boolean
    /** 流式输出间隔 单位：毫秒 */
    interval?: number
    /** 打字完成回调 */
    onTypingComplete?: () => void
}

interface UseStreamContentResult {
    /** 当前显示内容 */
    displayContent: string
    /** 是否打字中 */
    isTyping: boolean
}

/**
 * 流式内容展示 hook 防闪烁优化
 * 
 * 核心策略：
 * 1. isMessageEnd 为 true，直接显示完整内容 (历史消息或流式结束)
 * 2. 内容增长时 按结构边界分块 定时逐块输出，避免内容闪烁问题
 * 3. 首次渲染时内容超过100 字符 视为历史消息，跳过打字效果
 * 
 * 结构边界检测
 * -代码块``` 开头的块完整输出
 * -$$ 块级数学公式完整输出
 * -普通文本按字符流式输出
 */
export function useStreamContent({
    content,
    isMessageEnd,
    interval,
    onTypingComplete
}: UseStreamContentOptions): UseStreamContentResult {
    const [displayContent, setDisplayContent] = useState('')
    const [isTyping, setIsTyping] = useState(false)

    const currentIndexRef = useRef(0)
    const currentRef = useRef(content)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const onTypingCompleteRef = useRef(onTypingComplete)
    const isFirstRenderRef = useRef(true)
    // 创建边界计算器实例（每个组件实例独立缓存）
    const streamBufferCalculatorRef = useRef(createStreamBufferCalculator())

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [])

    // 初始化 onTypingCompleteRef
    useEffect(() => {
        onTypingCompleteRef.current = onTypingComplete
    }, [onTypingComplete])

    // 初始化 currentRef
    useEffect(() => {
        currentRef.current = content
    }, [content])

    // 核心逻辑，根据 content 变化来判断是否需要定时输出
    useEffect(() => {
        // 消息已结束或者内容为空，直接显示完整内容
        if (isMessageEnd || !content) {
            clearTimer()
            setDisplayContent(content||'')
            currentIndexRef.current = content?.length || 0
            setIsTyping(false)
            return
        }
        // 首次渲染检测： 如果首次就有大量内容，直接显示完整内容
        if (isFirstRenderRef.current && content.length > 100) {
            isFirstRenderRef.current = false
            setDisplayContent(content)
            currentIndexRef.current = content?.length
            setIsTyping(false)
            return
        }
        isFirstRenderRef.current = false

        // 当前已经显示到末尾了，等待新内容
        if (currentIndexRef.current >= content?.length) {
            return
        }

        // timer存在，说明正在定时输出，新content来的时候会通过 contentRef 更新
        if(timerRef.current) return

        setIsTyping(true)

        timerRef.current = setInterval(() => {
            const latestContent = currentRef.current
            if(currentIndexRef.current >= latestContent.length) {
                // 已经显示到末尾了，等待新内容
                return
            }
            // 使用带缓存的边界计算器
            const buffers = streamBufferCalculatorRef.current(latestContent)
            const nextBoundary = findNextBoundary(latestContent, currentIndexRef.current, buffers)
            currentIndexRef.current = nextBoundary
            setDisplayContent(latestContent.slice(0, nextBoundary))
        }, interval)
        
        return clearTimer
    }, [content, isMessageEnd, interval, clearTimer])

    // 消息已结束时，清理定时器 并显示完整内容
    useEffect(() => {
        if(isMessageEnd) {
            clearTimer()
            setDisplayContent(currentRef.current || '')
            currentIndexRef.current = currentRef.current?.length || 0
            setIsTyping(false)
            onTypingCompleteRef.current?.()
        }
    }, [isMessageEnd, clearTimer])

    // 组件卸载时确保清理定时器
    useEffect(() => {
        return clearTimer
    }, [clearTimer])

    return {
        displayContent,
        isTyping
    }
}


/** 
 * 将内容按结构边界分割为缓冲块
 * 使用闭包缓存已计算的边界，只对增量部分重算
 */
function createStreamBufferCalculator() {
    let cachedContent = ''
    let cachedBoundaries: number[] = []

    return function getStreamBuffers(content: string): number[] {
        // 如果内容没有变化，直接返回缓存
        if (content === cachedContent) {
            return cachedBoundaries
        }

        // 如果内容变短（比如编辑），清空缓存重新计算
        if (content.length < cachedContent.length) {
            cachedContent = ''
            cachedBoundaries = []
        }

        // 找到新内容的起始位置（从缓存内容之后开始）
        const startIndex = cachedContent.length
        
        // 如果没有缓存，从头开始
        if (startIndex === 0) {
            cachedBoundaries = calculateBoundaries(content)
            cachedContent = content
            return cachedBoundaries
        }

        // 增量计算新内容的边界
        const newContent = content.slice(startIndex)
        const newBoundaries = calculateBoundaries(newContent)
        
        // 将新边界偏移到完整内容的位置
        const offsetBoundaries = newBoundaries.map(b => b + startIndex)
        
        // 如果最后一个边界不是内容末尾，需要检查是否与前面的块合并
        if (offsetBoundaries.length > 0 && offsetBoundaries[offsetBoundaries.length - 1] < content.length) {
            cachedBoundaries = cachedBoundaries.concat(offsetBoundaries)
        } else if (offsetBoundaries.length > 0) {
            // 如果最后一个边界到达末尾，需要检查是否需要调整
            const lastBoundary = cachedBoundaries[cachedBoundaries.length - 1]
            if (lastBoundary < content.length) {
                cachedBoundaries = cachedBoundaries.concat(offsetBoundaries)
            }
        }
        
        cachedContent = content
        return cachedBoundaries
    }
}

/**
 * 实际计算边界的函数
 */
function calculateBoundaries(content: string): number[] {
    const boundaries: number[] = []
    let i = 0

    while (i < content.length) {
        // 检测代码块开始```
        if (content.startsWith('```', i)) {
            // 跳过 ``` 及 language 标识行
            const lineEnd = content.indexOf('\n', i)
            if (lineEnd === -1) {
                boundaries.push(content.length)
                break
            }
            // 查找对应的闭合 ```
            const closeIndex = content.indexOf('```', lineEnd)
            if (closeIndex !== -1) {
                const blockEnd = closeIndex + 4 // 包含\n```
                // 跳过闭合 ``` 后面可能的换行
                const afterClose = blockEnd < content.length && content[blockEnd] === '\n'
                    ? blockEnd + 1
                    : blockEnd
                boundaries.push(afterClose)
                i = afterClose
                continue
            } else {
                // 未闭合的代码块，把剩余的部分都作为一个块输出
                boundaries.push(content.length)
                break
            }

            i = closeIndex + 3
            continue
        }

        // 检测块级公式$$
        if (content.startsWith('$$', i)) {
            const closeIndex = content.indexOf('$$', i + 2)
            if (closeIndex !== -1) {
                const blockEnd = closeIndex + 2 // 包含\n$$
                boundaries.push(blockEnd)
                i = blockEnd
                continue
            } else {
                // 未闭合的公式，把剩余的部分都作为一个块输出
                boundaries.push(content.length)
                break
            }
        }

        // 普通字符 按块或者小块输出
        const nextNewLine = content.indexOf('\n', i)
        if (nextNewLine !== -1 && nextNewLine - i < 80) {
            boundaries.push(nextNewLine + 1)
            i = nextNewLine + 1
        } else {
            // 每20个字符一个边界点
            const step = Math.min(20, content.length - i)
            boundaries.push(i + step)
            i += step
        }
    }
    return boundaries
}

/** 
 * 找到下一个安全的边界
 */
function findNextBoundary(content: string, currentPos: number, boundaries: number[]): number {
    for (const boundary of boundaries) {
        //  找到第一个大于当前位置的边界点
        if (boundary > currentPos) {
            return boundary
        }
    }
    return content.length
}