"use client"

import React, { memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeHighlight from "rehype-highlight"
import rehypeKatex from "rehype-katex"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    MermaidDiagram,
    CardBlock,
    EChartBlock,
    HTMLBlock,
    type CustomCodeBlockRenderer
} from "./markdown-extensions"
import type { MarkdownBlock } from "@/lib/markdown/parse-blocks"
import { ComponentErrorBoundary } from "./component-error-boundary"

interface MemoizedBlockProps {
    block: MarkdownBlock
    enableMermaid?: boolean
    enableMath?: boolean
    customRenderers?: CustomCodeBlockRenderer[]
    onSendMessage?: (message: string) => void
    enabled?: boolean
}

const RAW_TEXT_LANGUAGE = new Set(["mermaid", "card", "echart", "html"])

function extractText(node: React.ReactNode): string {
    if (!node) return ""
    if (typeof node === "string") return node
    if (typeof node === "number") return String(node)
    if (Array.isArray(node)) return node.map(extractText).join("")
    if (typeof node === "object" && node !== null && "props" in node) {
        const props = (node as unknown as Record<string, Record<string, unknown>>).props
        return extractText(props.children as React.ReactNode)
    }
    return ""
}

function BlockCodeBlock({
    className,
    children,
    enableMermaid,
    customRenderers,
    onSendMessage,
    enabled = true,
    ...props
}: React.HTMLAttributes<HTMLElement> & {
    children?: React.ReactNode
    enableMermaid?: boolean
    customRenderers?: CustomCodeBlockRenderer[]
    onSendMessage?: (message: string) => void
    enabled?: boolean
}) {
    const [copied, setCopied] = React.useState(false)
    const codeRef = React.useRef<HTMLElement>(null)
    const match = /language-(\w+)/.exec(className || "")
    const language = match?.[1] || "plaintext"

    const reactText = React.useMemo(() => extractText(children).replace(/\n$/, ""), [children])
    const [domText, setDomText] = React.useState("")
    const needsDomText = RAW_TEXT_LANGUAGE.has(language)

    React.useEffect(() => {
        if (needsDomText && codeRef.current) {
            const text = (codeRef.current.textContent || "").replace(/\n$/, "")
            setDomText(text)
        }
    }, [needsDomText, children])

    const codeText = needsDomText && domText ? domText : reactText

    const handleCopy = React.useCallback(() => {
        navigator.clipboard.writeText(codeText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [codeText])

    if (!className) {
        return (
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono" {...props}>
                {children}
            </code>
        )
    }

    if (enableMermaid && language === "mermaid") {
        return (
            <ComponentErrorBoundary>
                <code ref={codeRef} className={className} style={{ display: "none" }} {...props}>
                    {children}
                </code>
                <MermaidDiagram content={codeText} />
            </ComponentErrorBoundary>
        )
    }

    if (language === "echart") {
        return (
            <ComponentErrorBoundary>
                <code ref={codeRef} className={className} style={{ display: "none" }} {...props}>
                    {children}
                </code>
                <EChartBlock content={codeText} />
            </ComponentErrorBoundary>
        )
    }

    if (language === "html") {
        return (
            <ComponentErrorBoundary>
                <code ref={codeRef} className={className} style={{ display: "none" }} {...props}>
                    {children}
                </code>
                <HTMLBlock content={codeText} />
            </ComponentErrorBoundary>
        )
    }

    if (language === "card") {
        return (
            <ComponentErrorBoundary>
                <code ref={codeRef} className={className} style={{ display: "none" }} {...props}>
                    {children}
                </code>
                <CardBlock content={codeText} onSendMessage={onSendMessage} enabled={enabled} />
            </ComponentErrorBoundary>
        )
    }

    const customRenderer = customRenderers?.find((r) => r.language === language)
    if (customRenderer) {
        const CustomComponent = customRenderer.component
        return (
            <ComponentErrorBoundary>
                <CustomComponent content={codeText}>{children}</CustomComponent>
            </ComponentErrorBoundary>
        )
    }

    return (
        <div className="group relative my-3">
            <div className="flex items-center justify-between px-4 py-2 rounded-t-lg bg-zinc-800 text-xs text-zinc-400">
                <span>{language}</span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 hover:text-zinc-200 transition-colors"
                >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "已复制" : "复制"}
                </button>
            </div>
            <pre className="!mt-0 !rounded-t-none bg-zinc-800 overflow-x-auto whitespace-pre-wrap break-all">
                <code className={className} {...props}>
                    {children}
                </code>
            </pre>
        </div>
    )
}

function BlockContent({
    block,
    enableMermaid = true,
    enableMath = true,
    customRenderers = [],
    onSendMessage,
    enabled = true
}: MemoizedBlockProps) {
    const codeComponent = React.useMemo(() => {
        return function CodeWrapper(
            props: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }
        ) {
            return (
                <BlockCodeBlock
                    {...props}
                    enableMermaid={enableMermaid}
                    customRenderers={customRenderers}
                    onSendMessage={onSendMessage}
                    enabled={enabled}
                />
            )
        }
    }, [enableMermaid, customRenderers, onSendMessage, enabled])

    const remarkPlugins = React.useMemo(() => {
        const plugins: Array<any> = [remarkGfm]
        if (enableMath) plugins.push(remarkMath)
        return plugins
    }, [enableMath])

    const rehypePlugins = React.useMemo(() => {
        const plugins: Array<any> = [rehypeHighlight]
        if (enableMath) plugins.push(rehypeKatex)
        return plugins
    }, [enableMath])

    return (
        <div
            key={block.key}
            className={cn("prose prose-sm max-w-none dark:prose-invert", {
                "opacity-70": block.isIncomplete
            })}
        >
            <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={{
                    code: codeComponent,
                    p: ({ children }) => <p className="mb-3 last:mb-0 leading-7">{children}</p>,
                    ul: ({ children }) => (
                        <ul className="mb-3 list-disc pl-6 space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="mb-3 list-decimal pl-6 space-y-1">{children}</ol>
                    ),
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    a: ({ children, href }) => (
                        <a
                            className="text-primary underline"
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {children}
                        </a>
                    ),
                    table: ({ children }) => (
                        <div className="my-3 overflow-x-auto">
                            <table className="w-full border-collapse border border-border text-sm">
                                {children}
                            </table>
                        </div>
                    ),
                    th: ({ children }) => (
                        <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="border border-border px-3 py-2">{children}</td>
                    )
                }}
            >
                {block.content}
            </ReactMarkdown>
        </div>
    )
}

function blockAreEqual(prevProps: MemoizedBlockProps, nextProps: MemoizedBlockProps): boolean {
    return (
        prevProps.block.content === nextProps.block.content &&
        prevProps.block.startIndex === nextProps.block.startIndex &&
        prevProps.block.isIncomplete === nextProps.block.isIncomplete &&
        prevProps.enableMermaid === nextProps.enableMermaid &&
        prevProps.enableMath === nextProps.enableMath &&
        prevProps.enabled === nextProps.enabled
    )
}

export const MemoizedBlock = memo(BlockContent, blockAreEqual)
