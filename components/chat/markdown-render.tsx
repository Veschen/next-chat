'use client'

import React, { useCallback, useState, useMemo, useRef, useEffect } from "react"
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
    useMarkdownPlugins,
    findCustomRenderer,
    type CustomCodeBlockRenderer,
    type MarkdownPluginConfig,
} from "./markdown-extensions"
import { useStreamContent } from "@/lib/hooks/use-stream-content"
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/monokai.min.css'

interface MarkdownRenderProps {
    content: string
    className?: string
    /** 插件配置 */
    plugins?: MarkdownPluginConfig[]
    /** 是否开启流式渲染 */
    streaming?: boolean
    /** 是否是消息结束 仅当 streaming 为 true 时生效 */
    isMessageEnd?: boolean
    /** 输入完成回调 */
    onTypingComplete?: () => void
}

interface CodeBlockProps extends React.HTMLAttributes<HTMLElement> {
    children?: React.ReactNode
    enableMermaid: boolean
    customRenderers: CustomCodeBlockRenderer[]
}

const RAW_TEXT_LANGUAGE = new Set(['mermaid', 'card', 'echart', 'html'])

function extractText(node: React.ReactNode): string {
    if (!node) return ''

    if (typeof node === 'string') return node

    if (typeof node === 'number') return String(node)

    if (Array.isArray(node)) return node.map(extractText).join('')

    if (typeof node === 'object' && node !== null && 'props' in node) {
        const props = (node as unknown as Record<string, Record<string, unknown>>).props
        return extractText(props.children as React.ReactNode)
    }
    return ''
}

function CodeBlock({
    className,
    children,
    enableMermaid,
    customRenderers,
    ...props
}: CodeBlockProps) {
    const [copied, setCopied] = useState(false)
    const codeRef = useRef<HTMLElement>(null)
    const match = /language-(\w+)/.exec(className || '')
    const language = match?.[1] || 'plaintext'

    const reactText = useMemo(() => extractText(children).replace(/\n$/, ''), [children])

    // 对于 mermaid 图表和 card 块，直接复制文本
    const [domText, setDomText] = useState('')
    const needsDomText = RAW_TEXT_LANGUAGE.has(language)

    useEffect(() => {
        if (needsDomText && codeRef.current) {
            const text = (codeRef.current.textContent || '').replace(/\n$/, '')
            setDomText(text)
        }

    }, [needsDomText, children])

    const codeText = needsDomText && domText ? domText : reactText

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(codeText)
        setCopied(true)
        setTimeout(() => {
            setCopied(false)
        }, 2000)
    }, [codeText])

    // 行内代码
    if (!className) {
        return (
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono" {...props}>
                {children}
            </code>
        )
    }

    // Mermaid 图表渲染
    if (enableMermaid && language === 'mermaid') {
        return (
            <>
                <code ref={codeRef} className={className} style={{ display: 'none' }} {...props}>
                    {children}
                </code>
                <MermaidDiagram content={codeText} />
            </>
        )
    }

    // EChart 图表渲染
    if (language === 'echart') {
        return (
            <>
                <code ref={codeRef} className={className} style={{ display: 'none' }} {...props}>
                    {children}
                </code>
                <EChartBlock content={codeText} />
            </>
        )
    }

    // HTML 代码块渲染
    if (language === 'html') {
        return (
            <>
                <code ref={codeRef} className={className} style={{ display: 'none' }} {...props}>
                    {children}
                </code>
                <HTMLBlock content={codeText} />
            </>
        )
    }

    // Card 块渲染
    if (language === 'card') {
        return (
            <>
                <code ref={codeRef} className={className} style={{ display: 'none' }} {...props}>
                    {children}
                </code>
                <CardBlock content={codeText} />
            </>
        )
    }

    // 自定义组件渲染器匹配
    const customRenderer = findCustomRenderer(language, customRenderers)
    if (customRenderer) {
        const CustomComponent = customRenderer.component
        return <CustomComponent content={codeText}>{children}</CustomComponent>
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
                    {copied ? '已复制' : '复制'}
                </button>
            </div>
            <pre className="!mt-0 !rounded-t-none bg-zinc-800">
                <code className={className} {...props}>
                    {children}
                </code>
            </pre>
        </div>
    )
}

export function MarkdownRender({
    content,
    className,
    plugins: propsPlugins,
    streaming = false,
    isMessageEnd = true,
    onTypingComplete,
}: MarkdownRenderProps) {
    const contextPlugins = useMarkdownPlugins()
    const config = useMemo(() =>
        ({ ...contextPlugins, ...propsPlugins }),
        [contextPlugins, propsPlugins])

    const enableMermaid = config.mermaid !== false
    const enableMath = config.math !== false
    const customRenderers = config.customRenderers || []

    // 流式渲染 如果开启streaming 通过hook逐步展示
    const { displayContent } = useStreamContent({
        content,
        isMessageEnd: streaming ? isMessageEnd : true,
        onTypingComplete,
    })

    const renderContent = streaming ? displayContent : content

    // 动态组装 remark/rehype 插件
    const remarkPlugins = useMemo(() => {
        const plugins: Array<any> = [remarkGfm]
        if (enableMath) plugins.push(remarkMath)
        return plugins
    }, [enableMath])

    const rehypePlugins = useMemo(() => {
        const plugins: Array<any> = [rehypeHighlight]
        if (enableMath) plugins.push(rehypeKatex)
        return plugins
    }, [enableMath])

    // 通过闭包将配置传递给 CodeBlock 组件, 避免每次渲染都引用
    const codeComponent = useMemo(() => {
        return function MarkdownCodeBlock(props: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
            return (
                <CodeBlock
                    {...props}
                    enableMermaid={enableMermaid}
                    customRenderers={customRenderers}
                />
            )
        }
    }, [enableMermaid, customRenderers])

    return (
        <div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
            <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={{
                    code: codeComponent,
                    p: ({ children }) => <p className="mb-3 last:mb-0 leading-7">{children}</p>,
                    ul: ({ children }) => <ul className="mb-3 list-disc pl-6 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-3 list-decimal pl-6 space-y-1">{children}</ol>,
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
                    th: ({ children }) => <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">{children}</th>,
                    td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
                }}
            >
                {renderContent}
            </ReactMarkdown>
        </div>
    )
}