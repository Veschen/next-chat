'use client'

import React, { useRef } from 'react'
import { jsonrepair } from 'jsonrepair'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CheckCircle2, HelpCircle } from 'lucide-react'

/**
 * 卡片块数据结构
 * 通过 JSON 在代码块中传入
 */
interface CardBlockData {
    title: string
    badge?: { text: string, variant?: "destructive" | "default" | "secondary" | "outline" | "ghost" | "link" }
    tabs?: { label: string, value: string, content: string }[]
    sections?: SectionData[]
    footer?: { buttons: ButtonData[] }
}

interface SectionData {
    title: string
    items?: ItemData[]
    content?: string
}

interface ItemData {
    label: string
    detail?: string
    status?: 'success' | 'warning' | 'info' | 'default'
    highlight?: string
}

interface ButtonData {
    text: string
    variant?: "destructive" | "default" | "secondary" | "outline" | "ghost" | "link"
    action?: string
    /** 按钮动作类型 */
    actionType?: 'confirm' | 'submit' | 'navigate'
    /** 动作值，配合 actionType 使用 */
    actionValue?: string
}

interface CardBlockProps {
    content: string
    /** 发送消息回调 */
    onSendMessage?: (message: string) => void
    /** 是否启用按钮（仅最新消息显示按钮） */
    enabled?: boolean
}

/**
 *  预处理JSON 字符串， 去除末尾干扰字符
 */
function formatJsonData(str: string) {
    const trailingBackticks = str.match(/`+$/)
    if (trailingBackticks) {
        return str.slice(0, -trailingBackticks[0].length)
    }
    if (str.endsWith('/')) {
        return `${str}"`
    }
    return str
}

/**
 * 尝试解析卡片块数据,使用jsonrepair修复JSON字符串
 */
function parseCardData(data: string): CardBlockData | null {
    try {
        return JSON.parse(jsonrepair(formatJsonData(data)))
    } catch (error) {
        return null
    }
}

/**
 * 自定义卡片块组件
 */
export function CardBlock({ content, onSendMessage, enabled = true }: CardBlockProps) {
    const lastValidRef = useRef<CardBlockData | null>(null)

    const parsed = parseCardData(content)

    // 解析成功 ——> 更新缓存
    if (parsed) {
        if (!lastValidRef.current) {
            lastValidRef.current = parsed
        } else {
            // 简单策略 新数据有title 则视为有效数据
            if (parsed.title) {
                lastValidRef.current = parsed
            }
        }
    }

    // 如果从未成功解析过，显示骨架屏
    if (!lastValidRef.current) {
        return (
            <Card className="my-4 animate-pulse">
                <CardContent className="p-5">
                    <div className="flex justify-center gap-3 mb-4">
                        <div className="w-32 h-5 rounded bg-muted" />
                        <div className="w-16 h-5 rounded-full bg-muted" />
                    </div>
                    <div className="space-y-2">
                        <div className="w-full h-4 rounded bg-muted" />
                        <div className="w-3/4 h-4 rounded bg-muted" />
                        <div className="w-1/2 h-4 rounded bg-muted" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    const cardData = lastValidRef.current

    /**
     * 处理按钮点击
     */
    const handleButtonClick = (button: ButtonData) => {
        if (!onSendMessage) return

        // 根据 actionType 执行不同的动作
        switch (button.actionType) {
            case 'confirm':
                // 确认类型：发送确认消息，包含 actionValue
                if (button.actionValue) {
                    onSendMessage(button.actionValue)
                } else {
                    onSendMessage(`确认: ${button.text}`)
                }
                break
            case 'submit':
                // 提交类型：发送提交消息
                if (button.actionValue) {
                    onSendMessage(button.actionValue)
                } else {
                    onSendMessage(`提交: ${button.text}`)
                }
                break
            case 'navigate':
                // 导航类型：发送导航消息
                onSendMessage(`导航到: ${button.actionValue || button.text}`)
                break
            default:
                // 默认：发送按钮文本作为消息
                onSendMessage(button.action || button.text)
        }
    }

    return (
        <Card className="gap-0 my-4 w-full max-w-sm not-prose text-sm text-wrap">
            {/* 卡片标题 + 标签 */}
            <CardHeader className="px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base whitespace-nowrap">{cardData.title}</CardTitle>
                    {
                        cardData.badge && (
                            <Badge variant={cardData.badge.variant || 'default'} className="text-xs cursor-pointer">
                                {cardData.badge.text}
                            </Badge>
                        )
                    }
                </div>
            </CardHeader>

            <CardContent className="space-y-3 px-4 pb-3 pt-0">
                {/* tabs区域 */}
                {
                    cardData.tabs && cardData.tabs.length > 0 && (
                        <Tabs defaultValue={cardData.tabs[0].value}>
                            <TabsList key="__tabs-list" className="h-8 w-full">
                                {cardData.tabs.filter(tab => tab.value).map((tab, index) => (
                                    <TabsTrigger key={`${tab.value}+${index}`} value={tab.value} className="text-xs py-1">
                                        {tab.label || ''}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {
                                cardData.tabs.filter(tab => tab.value).map((tab, index) => (
                                    <TabsContent key={`${tab.value}+${index}`} value={tab.value} className="text-xs leading-relaxed text-foreground whitespace-pre-line">
                                        {tab.content}
                                    </TabsContent>
                                ))
                            }
                        </Tabs>
                    )
                }
                {/* sections区域 */}
                {
                    cardData.sections && cardData.sections.length > 0 && (
                        cardData.sections.map((section, index) => (
                            <div key={`${section.title}+${index}`} className="space-y-1.5">
                                {
                                    section.title && (
                                        <h4 className="font-bold text-sm text-foreground">
                                            {section.title}
                                        </h4>
                                    )
                                }
                                {
                                    section.content && (
                                        <p className="text-xs leading-relaxed text-muted-foreground">
                                            {section.content}
                                        </p>
                                    )
                                }
                                {
                                    section.items && (
                                        <div className="rounded-md border bg-muted/20 p-3 text-xs">
                                            {
                                                section.items.map((item, index) => (
                                                    <div key={`${item}+${index}`} className="relative pl-5 mb-2 last:mb-0">
                                                        <div className="absolute left-0 top-0.5">
                                                            {
                                                                // TODO: 处理其他状态
                                                                item.status === 'success' ? (
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                                                ) : (
                                                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                                                                )
                                                            }
                                                        </div>
                                                        <p className="text-muted-foreground">{item.label}</p>
                                                        {
                                                            item.detail && (
                                                                <p className="text-muted-foreground mt-0.5">
                                                                    {item.highlight && <span className="font-medium text-orange-500">{item.highlight}</span>}
                                                                    {item.detail}
                                                                </p>
                                                            )
                                                        }
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    )
                                }

                            </div>
                        ))
                    )
                }
            </CardContent>

            {/* 底部按钮 - 仅在 enabled 为 true 时显示 */}
            {
                enabled && cardData.footer && cardData.footer.buttons && cardData.footer.buttons.length > 0 && (
                    <CardFooter className="px-4 py-3 gap-2">
                        {
                            cardData.footer.buttons.map((button, index) => (
                                <Button
                                    key={`${button.text}+${index}`}
                                    variant={button.variant || 'default'}
                                    size="sm"
                                    className="flex-1 text-xs"
                                    onClick={() => handleButtonClick(button)}
                                >
                                    {button.text}
                                </Button>
                            ))
                        }
                    </CardFooter>
                )
            }
        </Card>
    )
}