"use client"

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Bot, ArrowUp, ArrowDown } from "lucide-react"
import { ScrollArea } from "../ui/scroll-area"
import { Button } from "../ui/button"
import { MessageBubble } from "./message-bubble"
import { Suggestions } from "./suggestions"
import { useChatStore } from "@/lib/store"
import { useHydration } from "@/lib/hooks/use-hydration"
import { OPERATION_NAMES } from "@/lib/store/operation-slice"
import type { ChatMessage } from "@/lib/store/types"
import type { SuggestionItem, QuestionItem } from "@/lib/types"

interface MessageListProps {
    /** 消息列表 */
    messages: ChatMessage[]
    /** 是否开启流式渲染 */
    isStreaming: boolean
    /** 欢迎问题 */
    welcomeQuestions?: QuestionItem[]
    /** 建议列表 */
    suggestions?: SuggestionItem[]
    /** 建议展示模式 */
    suggestionMode?: "default" | "dropdown"
    /** 是否紧凑模式 */
    compact?: boolean
}

interface ScrollAreaWrapperProps {
    /** 是否紧凑模式 */
    compact?: boolean
    /** 滚动视口元素 */
    viewportRef: React.RefObject<HTMLDivElement | null>
    /** 检测滚动能力函数 */
    checkScroll: (el: HTMLDivElement) => void
    /** 子元素 */
    children: React.ReactNode
}

/**
 * 滚动区域包装器
 * 紧凑模式使用原生div(避免 display: table 撑宽小屏幕气泡的问题)
 * 非紧凑模式使用Radix ScrollArea
 */
function ScrollAreaWrapper({
    compact,
    viewportRef,
    checkScroll,
    children
}: ScrollAreaWrapperProps) {
    if (compact) {
        return (
            <div className="flex flex-1 flex-col min-h-0 relative">
                <div
                    className="flex-1 min-h-0 overflow-y-auto"
                    ref={(node) => {
                        // 获取 radix ScrollArea 内部的 viewport 节点
                        if (node && node !== viewportRef.current) {
                            viewportRef.current = node
                            checkScroll(node)
                        }
                    }}
                >
                    {children}
                </div>
            </div>
        )
    }
    return (
        <ScrollArea className="flex-1 min-h-0 overflow-hidden">
            <div
                ref={(node) => {
                    // 获取 radix ScrollArea 内部的 viewport 节点
                    if (node) {
                        const viewport = node.closest(
                            '[data-slot="scroll-area-viewport"]'
                        ) as HTMLDivElement | null
                        if (viewport && viewport !== viewportRef.current) {
                            viewportRef.current = viewport
                            checkScroll(viewport)
                        }
                    }
                }}
            >
                {children}
            </div>
        </ScrollArea>
    )
}

export function MessageList({
    messages,
    isStreaming,
    welcomeQuestions = [],
    suggestions = [],
    suggestionMode = "default",
    compact = false
}: MessageListProps) {
    // 从全局操作注册表获取操作
    const operationsMap = useChatStore((state) => state.operationsMap)
    const isHydrated = useHydration()

    // 让滚动条自然滚动到最底部
    const bottomRef = useRef<HTMLDivElement>(null)
    const viewportRef = useRef<HTMLDivElement | null>(null)

    // 滚动状态：是否可向上/向下滚动
    const [canScrollUp, setCanScrollUp] = useState(false)
    const [canScrollDown, setCanScrollDown] = useState(false)

    /**
     * 检测当前滚动容器的滚动能力
     * 向上/向下按钮互斥：靠近底部时显示向上，靠近顶部时显示向下
     * @param el - 滚动视口元素
     */
    const checkScroll = useCallback((el: HTMLDivElement) => {
        const { scrollTop, scrollHeight, clientHeight } = el
        const hasOverflow = scrollHeight > clientHeight
        if (!hasOverflow) {
            setCanScrollUp(false)
            setCanScrollDown(false)
            return
        }
        const scrollBottom = scrollHeight - clientHeight - scrollTop
        // 距离底部更远（靠近顶部）显示向下，否则显示向上
        if (scrollTop > scrollBottom) {
            setCanScrollUp(true)
            setCanScrollDown(false)
        } else {
            setCanScrollUp(false)
            setCanScrollDown(true)
        }
    }, [])

    // 监听滚动事件并检测滚动能力
    useEffect(() => {
        const viewport = viewportRef.current
        if (!viewport) return

        const handleScroll = () => checkScroll(viewport)
        // 初始化检测一次
        handleScroll()

        viewport.addEventListener("scroll", handleScroll)
        // 使用 ResizeObserver 监听内容变化，重新计算滚动能力
        const ro = new ResizeObserver(() => handleScroll())
        ro.observe(viewport)

        return () => {
            viewport.removeEventListener("scroll", handleScroll)
            ro.disconnect()
        }
    }, [checkScroll, messages])

    /** 滚动到顶部 */
    const scrollToTop = useCallback(() => {
        viewportRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    }, [])

    /** 滚动到底部 */
    const scrollToBottom = useCallback(() => {
        viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" })
    }, [])

    // 判断是否应该展示建议回复： 最后一条消息是assistant 且非流式中
    const showSuggestions = useMemo(() => {
        return (
            suggestions.length > 0 &&
            !isStreaming &&
            messages.at(-1)?.role === "assistant" &&
            !!operationsMap[OPERATION_NAMES.SUGGESTION_SELECT]
        )
    }, [isStreaming, suggestions, messages, operationsMap])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isStreaming])

    // 水合完成前始终显示空状态，避免 hydration mismatch
    // 因为服务端没有 localStorage 数据，messages 为空
    // 客户端水合后如果有持久化数据，messages 会有值
    // 如果服务端和客户端渲染不同结构会导致 hydration mismatch
    const hasMessages = isHydrated ? messages.length > 0 : false

    // 找到最后一条 assistant 消息的 id，用 useMemo 缓存避免每次渲染重建数组
    const lastAssistantId = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === "assistant") {
                return messages[i].id
            }
        }
        return undefined
    }, [messages])

    return (
        <ScrollAreaWrapper compact={compact} viewportRef={viewportRef} checkScroll={checkScroll}>
            <div className="max-w-3xl mx-auto py-4 min-h-full">
                {!hasMessages ? (
                    // 空状态 - 欢迎页面
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-6 p-8 min-h-full">
                        <div className="rounded-full bg-emerald-500/10 p-4">
                            <Bot className="h-8 w-8 text-emerald-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-foreground mb-1">
                                你好，有什么可以帮助你的吗？
                            </h3>
                            <p className="text-sm">
                                选择下方的问题快速开始，或直接在下方输入框输入问题，即可开始对话
                            </p>
                        </div>
                        {welcomeQuestions.length > 0 && (
                            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                                {welcomeQuestions.map((item) => (
                                    <button
                                        key={item.prompt}
                                        onClick={() =>
                                            operationsMap[OPERATION_NAMES.QUESTION_SELECT]?.(
                                                item.prompt
                                            )
                                        }
                                        className={cn(
                                            "flex items-center rounded-xl gap-2.5 bg-background border",
                                            "px-4 py-3 text-left text-sm shadow-sm transition-all",
                                            "hover:bg-accent hover:shadow-md active:scale-[0.98]"
                                        )}
                                    >
                                        <span className="text-lg shrink-0">{item.icon}</span>
                                        <span className="text-foreground line-clamp-2">
                                            {item.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    // 消息列表
                    <>
                        {messages.map((message) => (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                isLastAssistant={message.id === lastAssistantId}
                                isStreaming={isStreaming}
                                compact={compact}
                            />
                        ))}
                        {showSuggestions && (
                            <Suggestions
                                items={suggestions}
                                onSelect={(prompt) =>
                                    operationsMap[OPERATION_NAMES.SUGGESTION_SELECT]?.(prompt)
                                }
                                className="mt-1 ml-12"
                                mode={suggestionMode}
                            />
                        )}
                    </>
                )}
                <div ref={bottomRef} />
            </div>

            {/* 快速定位按钮：根据滚动状态显示向上/向下箭头，互斥显示 */}
            {(canScrollUp || canScrollDown) && (
                <div className="absolute right-4 bottom-4 z-10">
                    {canScrollUp && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={scrollToTop}
                            className="rounded-full shadow-lg bg-background/90 backdrop-blur-sm h-10 w-10"
                            aria-label="滚动到顶部"
                        >
                            <ArrowUp className="h-5 w-5" />
                        </Button>
                    )}
                    {canScrollDown && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={scrollToBottom}
                            className="rounded-full shadow-lg bg-background/90 backdrop-blur-sm h-10 w-10"
                            aria-label="滚动到底部"
                        >
                            <ArrowDown className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            )}
        </ScrollAreaWrapper>
    )
}
