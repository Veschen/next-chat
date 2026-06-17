"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { holdBackPartialMarkers } from "@/lib/markdown/remend"

interface UseStreamContentOptions {
    content: string
    isMessageEnd: boolean
    interval?: number
    onTypingComplete?: () => void
}

interface UseStreamContentResult {
    displayContent: string
    isTyping: boolean
}

export function useStreamContent({
    content,
    isMessageEnd,
    interval = 50,
    onTypingComplete
}: UseStreamContentOptions): UseStreamContentResult {
    const [displayContent, setDisplayContent] = useState("")
    const [isTyping, setIsTyping] = useState(false)

    const currentIndexRef = useRef(0)
    const currentRef = useRef(content)
    const rafRef = useRef<number | null>(null)
    const onTypingCompleteRef = useRef(onTypingComplete)
    const isFirstRenderRef = useRef(true)
    const lastUpdateTimeRef = useRef(0)
    const streamBufferCalculatorRef = useRef(createStreamBufferCalculator())

    const clearRaf = useCallback(() => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }
    }, [])

    useEffect(() => {
        onTypingCompleteRef.current = onTypingComplete
    }, [onTypingComplete])

    useEffect(() => {
        currentRef.current = content
    }, [content])

    useEffect(() => {
        if (isMessageEnd || !content) {
            clearRaf()
            const finalContent = holdBackPartialMarkers(content || "")
            setDisplayContent(finalContent)
            currentIndexRef.current = finalContent.length
            setIsTyping(false)
            return
        }

        if (isFirstRenderRef.current && content.length > 100) {
            isFirstRenderRef.current = false
            const finalContent = holdBackPartialMarkers(content)
            setDisplayContent(finalContent)
            currentIndexRef.current = finalContent.length
            setIsTyping(false)
            return
        }
        isFirstRenderRef.current = false

        if (currentIndexRef.current >= content.length) {
            return
        }

        if (rafRef.current) return

        setIsTyping(true)

        const animate = (timestamp: number) => {
            if (!rafRef.current) return

            const elapsed = timestamp - lastUpdateTimeRef.current

            if (elapsed >= interval) {
                lastUpdateTimeRef.current = timestamp
                const latestContent = currentRef.current

                if (currentIndexRef.current >= latestContent.length) {
                    rafRef.current = requestAnimationFrame(animate)
                    return
                }

                const buffers = streamBufferCalculatorRef.current(latestContent)
                const nextBoundary = findNextBoundary(
                    latestContent,
                    currentIndexRef.current,
                    buffers
                )

                const remainingChars = latestContent.length - nextBoundary
                const adaptiveStep = calculateAdaptiveStep(remainingChars, interval)

                const actualNextIndex = Math.min(nextBoundary + adaptiveStep, latestContent.length)
                currentIndexRef.current = actualNextIndex

                let partialContent = latestContent.slice(0, actualNextIndex)
                partialContent = holdBackPartialMarkers(partialContent)

                setDisplayContent(partialContent)
            }

            rafRef.current = requestAnimationFrame(animate)
        }

        rafRef.current = requestAnimationFrame(animate)

        return clearRaf
    }, [content, isMessageEnd, interval, clearRaf])

    useEffect(() => {
        if (isMessageEnd) {
            clearRaf()
            const finalContent = holdBackPartialMarkers(currentRef.current || "")
            setDisplayContent(finalContent)
            currentIndexRef.current = finalContent.length
            setIsTyping(false)
            onTypingCompleteRef.current?.()
        }
    }, [isMessageEnd, clearRaf])

    useEffect(() => {
        return clearRaf
    }, [clearRaf])

    return {
        displayContent,
        isTyping
    }
}

function calculateAdaptiveStep(remainingChars: number, baseInterval: number): number {
    const baseStep = 1

    if (remainingChars > 1000) {
        return Math.floor(baseStep * 3)
    } else if (remainingChars > 500) {
        return Math.floor(baseStep * 2)
    } else if (remainingChars > 100) {
        return baseStep
    } else {
        return Math.floor(baseStep * 0.5)
    }
}

function createStreamBufferCalculator() {
    let cachedContent = ""
    let cachedBoundaries: number[] = []

    return function getStreamBuffers(content: string): number[] {
        if (content === cachedContent) {
            return cachedBoundaries
        }

        if (content.length < cachedContent.length) {
            cachedContent = ""
            cachedBoundaries = []
        }

        const startIndex = cachedContent.length

        if (startIndex === 0) {
            cachedBoundaries = calculateBoundaries(content)
            cachedContent = content
            return cachedBoundaries
        }

        const newContent = content.slice(startIndex)
        const newBoundaries = calculateBoundaries(newContent)
        const offsetBoundaries = newBoundaries.map((b) => b + startIndex)

        if (offsetBoundaries.length > 0) {
            if (
                cachedBoundaries.length === 0 ||
                cachedBoundaries[cachedBoundaries.length - 1] < content.length
            ) {
                cachedBoundaries = cachedBoundaries.concat(offsetBoundaries)
            }
        }

        cachedContent = content
        return cachedBoundaries
    }
}

function calculateBoundaries(content: string): number[] {
    const boundaries: number[] = []
    let i = 0

    while (i < content.length) {
        if (content.startsWith("```", i)) {
            const lineEnd = content.indexOf("\n", i)
            if (lineEnd === -1) {
                boundaries.push(snapPastBoundary(content, i))
                break
            }
            const closeIndex = content.indexOf("```", lineEnd)
            if (closeIndex !== -1) {
                const blockEnd = closeIndex + 4
                const afterClose =
                    blockEnd < content.length && content[blockEnd] === "\n"
                        ? blockEnd + 1
                        : blockEnd
                boundaries.push(afterClose)
                i = afterClose
                continue
            } else {
                boundaries.push(snapPastBoundary(content, i))
                break
            }
        }

        if (content.startsWith("$$", i)) {
            const closeIndex = content.indexOf("$$", i + 2)
            if (closeIndex !== -1) {
                const blockEnd = closeIndex + 2
                boundaries.push(blockEnd)
                i = blockEnd
                continue
            } else {
                boundaries.push(snapPastBoundary(content, i))
                break
            }
        }

        const isInHtmlTag = content.slice(i).match(/^<[^>]*>/)
        if (isInHtmlTag) {
            const tagEnd = i + isInHtmlTag[0].length
            boundaries.push(tagEnd)
            i = tagEnd
            continue
        }

        const nextNewLine = content.indexOf("\n", i)
        if (nextNewLine !== -1 && nextNewLine - i < 80) {
            boundaries.push(nextNewLine + 1)
            i = nextNewLine + 1
        } else {
            const step = Math.min(20, content.length - i)
            boundaries.push(i + step)
            i += step
        }
    }
    return boundaries
}

function snapPastBoundary(content: string, startPos: number): number {
    const patterns = [/```/g, /\$\$/g, /<\/[^>]+>/g]

    let maxBoundary = content.length

    for (const pattern of patterns) {
        pattern.lastIndex = startPos
        const match = pattern.exec(content)
        if (match && match.index > startPos) {
            maxBoundary = Math.min(maxBoundary, match.index + match[0].length)
        }
    }

    return maxBoundary
}

function findNextBoundary(content: string, currentPos: number, boundaries: number[]): number {
    for (const boundary of boundaries) {
        if (boundary > currentPos) {
            return boundary
        }
    }
    return content.length
}
