'use client'

import React, { useEffect, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Bot } from 'lucide-react'
import { ScrollArea } from '../ui/scroll-area'
import { MessageBubble } from './message-bubble'
import { Suggestions } from './suggestions'
import { useChatStore } from '@/lib/store'
import { useHydration } from '@/lib/hooks/use-hydration'
import { OPERATION_NAMES } from '@/lib/store/operation-slice'
import type { ChatMessage } from '@/lib/store/types'
import type { SuggestionItem, QuestionItem } from '@/lib/types'

interface MessageListProps {
    /** 消息列表 */
    messages: ChatMessage[]
    /** 是否开启流式渲染 */
    isStreaming: boolean
    /** 欢迎问题 */
    welcomeQuestions?: QuestionItem[]
    /** 建议列表 */
    suggestions?: SuggestionItem[]
}

export function MessageList({
    messages,
    isStreaming,
    welcomeQuestions = [],
    suggestions = [],
}: MessageListProps) {
    // 从全局操作注册表获取操作
    const operationsMap = useChatStore((state) => state.operationsMap)
    const isHydrated = useHydration()
    
    // 让滚动条自然滚动到最底部
    const bottomRef = useRef<HTMLDivElement>(null)

    // 判断是否应该展示建议回复： 最后一条消息是assistant 且非流式中
    const showSuggestions = useMemo(() => {
        return suggestions.length > 0 && !isStreaming && messages.at(-1)?.role === 'assistant' && !!operationsMap[OPERATION_NAMES.SUGGESTION_SELECT]
    }, [isStreaming, suggestions, messages, operationsMap])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isStreaming])

    // 水合完成前始终显示空状态，避免 hydration mismatch
    // 因为服务端没有 localStorage 数据，messages 为空
    // 客户端水合后如果有持久化数据，messages 会有值
    // 如果服务端和客户端渲染不同结构会导致 hydration mismatch
    const hasMessages = isHydrated ? messages.length > 0 : false

    // 找到最后一条消息的id
    const lastAssistantId = [...messages].reverse().find((msg) => msg.role === 'assistant')?.id

    return (
        <ScrollArea className="flex-1 min-h-0 overflow-hidden">
            <div className="max-w-3xl mx-auto py-4 min-h-full">
                {!hasMessages ? (
                    // 空状态 - 欢迎页面
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-6 p-8 min-h-[calc(100vh-200px)]">
                        <div className="rounded-full bg-emerald-500/10 p-4">
                            <Bot className="h-8 w-8 text-emerald-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-foreground mb-1">你好，有什么可以帮助你的吗？</h3>
                            <p className="text-sm">选择下方的问题快速开始，或直接在下方输入框输入问题，即可开始对话</p>
                        </div>
                        {
                            welcomeQuestions.length > 0 && (
                                <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                                    {welcomeQuestions.map((item) => (
                                        <button
                                            key={item.prompt}
                                            onClick={() => operationsMap[OPERATION_NAMES.QUESTION_SELECT]?.(item.prompt)}
                                            className={cn("flex items-center rounded-xl gap-2.5 bg-background border",
                                                "px-4 py-3 text-left text-sm shadow-sm transition-all",
                                                "hover:bg-accent hover:shadow-md active:scale-[0.98]"
                                            )}
                                        >
                                            <span className="text-lg shrink-0">{item.icon}</span>
                                            <span className="text-foreground line-clamp-2">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )
                        }
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
                            />
                        ))}
                        {showSuggestions && (
                            <Suggestions
                                items={suggestions}
                                onSelect={(prompt) => operationsMap[OPERATION_NAMES.SUGGESTION_SELECT]?.(prompt)}
                                className="mt-1 ml-12"
                            />
                        )}
                    </>
                )}
                <div ref={bottomRef} />
            </div>
        </ScrollArea>
    )
}
