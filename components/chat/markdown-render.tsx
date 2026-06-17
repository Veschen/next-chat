"use client"

import React, { useMemo } from "react"
import { cn } from "@/lib/utils"
import {
    useMarkdownPlugins,
    type CustomCodeBlockRenderer,
    type MarkdownPluginConfig
} from "./markdown-extensions"
import { useStreamContent } from "@/lib/hooks/use-stream-content"
import { parseMarkdownIntoBlocks } from "@/lib/markdown/parse-blocks"
import { remend } from "@/lib/markdown/remend"
import { MemoizedBlock } from "./memoized-block"
import { ComponentErrorBoundary } from "./component-error-boundary"
import "katex/dist/katex.min.css"
import "highlight.js/styles/monokai.min.css"

interface MarkdownRenderProps {
    content: string
    className?: string
    plugins?: MarkdownPluginConfig[]
    streaming?: boolean
    isMessageEnd?: boolean
    onTypingComplete?: () => void
    onSendMessage?: (message: string) => void
    enabled?: boolean
}

export function MarkdownRender({
    content,
    className,
    plugins: propsPlugins,
    streaming = false,
    isMessageEnd = true,
    onTypingComplete,
    onSendMessage,
    enabled = true
}: MarkdownRenderProps) {
    const contextPlugins = useMarkdownPlugins()
    const config = useMemo(
        () => ({ ...contextPlugins, ...propsPlugins }),
        [contextPlugins, propsPlugins]
    )

    const enableMermaid = config.mermaid !== false
    const enableMath = config.math !== false
    const customRenderers = config.customRenderers || []

    const { displayContent } = useStreamContent({
        content,
        isMessageEnd: streaming ? isMessageEnd : true,
        onTypingComplete
    })

    const renderContent = streaming ? displayContent : content
    const healedContent = useMemo(() => remend(renderContent), [renderContent])
    const blocks = useMemo(() => parseMarkdownIntoBlocks(healedContent), [healedContent])

    return (
        <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
            {blocks.map((block) => (
                <ComponentErrorBoundary key={block.key}>
                    <MemoizedBlock
                        block={block}
                        enableMermaid={enableMermaid}
                        enableMath={enableMath}
                        customRenderers={customRenderers}
                        onSendMessage={onSendMessage}
                        enabled={enabled}
                    />
                </ComponentErrorBoundary>
            ))}
            {blocks.length === 0 && renderContent && (
                <p className="text-sm leading-7">{renderContent}</p>
            )}
        </div>
    )
}
