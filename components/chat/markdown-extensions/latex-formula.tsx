"use client"

import React from "react"
import "katex/dist/katex.min.css"

/**
 * 内联数学公式组件
 * 用于渲染 $...$ 格式的内联数学公式
 */
export function InlineMath({ value }: { value: string }) {
    return (
        <span
            className="katex-inline"
            dangerouslySetInnerHTML={{ __html: renderKatex(value, false) }}
        />
    )
}

/**
 * 块级数学公式组件
 * 用于渲染 $$...$$ 格式的块级数学公式
 */
export function BlockMath({ value }: { value: string }) {
    return (
        <div className="my-3 overflow-x-auto py-2">
            <div dangerouslySetInnerHTML={{ __html: renderKatex(value, true) }} />
        </div>
    )
}

/**
 * 渲染 Katex 数学公式
 * 用于将 LaTeX �学公式渲染为 HTML 格式
 */
function renderKatex(tex: string, displayMode: boolean): string {
    try {
        const katex = require("katex")
        return katex.renderToString(tex, {
            displayMode,
            throwOnError: false,
            strict: false,
            trust: true
        })
    } catch {
        return `<code class="text-red-500">${escapeHtml(tex)}</code>`
    }
}

/**
 * 转义 HTML 特殊字符
 * 用于将 LaTeX 数学公式中的特殊字符转义为 HTML 实体
 */
function escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
