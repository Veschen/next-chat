"use client"

import React, { createContext, useContext, useMemo } from "react"

/**
 * 自定义代码块渲染器接口
 * 可通过此接口来扩展 Markdown 代码块的渲染能力
 */
export interface CustomCodeBlockRenderer {
    /** 匹配的代码块语言标签，支持单个或多个 */
    language: string | string[]
    /** 渲染组件 */
    component: React.ComponentType<{ content: string; children?: React.ReactNode }>
}

/**
 * markdown 扩展插件配置
 */
export interface MarkdownPluginConfig {
    /** 是否启用 mermaid 图表插件 */
    mermaid?: boolean
    /** 是否启用 LaTeX 数学公式插件 */
    math?: boolean
    /** 自定义代码块渲染器列表 */
    customRenderers?: CustomCodeBlockRenderer[]
}

/**
 * 默认的 markdown 扩展插件配置
 */
export const DEFAULT_CONFIG: MarkdownPluginConfig = {
    mermaid: true,
    math: true,
    customRenderers: []
}

/**
 * markdown 扩展插件上下文
 */
const MarkdownPluginContext = createContext<MarkdownPluginConfig>(DEFAULT_CONFIG)

/**
 * markdown 扩展插件提供器
 */
export function MarkdownPluginProvider({
    config,
    children
}: {
    config: MarkdownPluginConfig
    children: React.ReactNode
}) {
    const mergedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config])
    return (
        <MarkdownPluginContext.Provider value={mergedConfig}>
            {children}
        </MarkdownPluginContext.Provider>
    )
}

export function useMarkdownPlugins(): MarkdownPluginConfig {
    return useContext(MarkdownPluginContext)
}

/**
 * 根据语言标识查找匹配的自定义渲染器
 */
export function findCustomRenderer(
    language: string,
    renderers: CustomCodeBlockRenderer[] = []
): CustomCodeBlockRenderer | undefined {
    return renderers.find((renderer) => {
        const languages = Array.isArray(renderer.language) ? renderer.language : [renderer.language]
        return languages.includes(language)
    })
}
