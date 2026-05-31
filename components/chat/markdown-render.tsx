'use client'

import React, { useCallback, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface MarkdownRenderProps {
    content: string
    className?: string
}

function extractText(node: React.ReactNode): string {
    if (!node) {
        return ''
    }
    if (typeof node === 'string') {
        return node
    }
    if (typeof node === 'number') {
        return String(node)
    }
    if (Array.isArray(node)) {
        return node.map(extractText).join('')
    }
    if (typeof node === 'object' && 'props' in node) {
        return extractText(node.props.children)
    }
    return ''
}

function CodeBlock({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
    const [copied, setCopied] = useState(false)
    const match = /language-(\w+)/.exec(className || '')
    const language = match?.[1] || 'plaintext'
    const codeText = extractText(children).replace(/\n$/, '')

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(codeText)
        setCopied(true)
        setTimeout(() => {
            setCopied(false)
        }, 2000)
    }, [codeText])

    if (!className) {
        return (
            <code
                className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono"
                {...props}
            >
                {children}
            </code>
        )
    }
    return (
        <div className=" group relative my-3">
            <div className="flex items-center justify-between px-4 py-2 rounded-t-lg bg-zinc-800 text-xz text-zinc-400">
                <span>{language}</span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 hover:text-zinc-200 transition-colors"
                >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? '已复制' : '复制'}
                </button>
            </div>
            <pre className="!mt-0 !rounded-t-none">
                <code className={className} {...props}>
                    {children}
                </code>
            </pre>
        </div>
    )
}

export function MarkdownRender({ content, className }: MarkdownRenderProps) {
    return (
        <div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    code: CodeBlock,
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
                {content}
            </ReactMarkdown>
        </div>
    )
}