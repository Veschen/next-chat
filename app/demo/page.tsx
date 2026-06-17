"use client"

import { useState } from "react"
import { TrendingUp, Users, DollarSign, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HoverIcon } from "@/components/ai-assistant/hover-icon"
import { Entrance } from "@/components/ai-assistant/entrance"
import { WELCOME_QUESTIONS } from "@/lib/constants"

// Mock 数据
const mockData = {
    totalRevenue: 45231.89,
    revenueChange: 20.1,
    subscribers: 2350,
    subscribersChange: 180.1,
    sales: 12234,
    salesChange: 19,
    activeNow: 573,
    activeNowChange: 201
}

const statsCards = [
    {
        title: "总收入",
        value: `$${mockData.totalRevenue.toLocaleString()}`,
        description: "较上月",
        change: mockData.revenueChange,
        icon: DollarSign
    },
    {
        title: "订阅用户",
        value: `+${mockData.subscribers}`,
        description: "较上月",
        change: mockData.subscribersChange,
        icon: Users
    },
    {
        title: "销售额",
        value: `+${mockData.sales}`,
        description: "较上月",
        change: mockData.salesChange,
        icon: TrendingUp
    },
    {
        title: "活跃用户",
        value: `+${mockData.activeNow}`,
        description: "实时监控",
        change: mockData.activeNowChange,
        icon: Activity
    }
]

/**
 * 数据分析工作台演示页面
 * 展示统计卡片和悬浮 AI 助手
 */
export default function DemoPage() {
    const [panelVisible, setPanelVisible] = useState(false)

    const handleIconClick = () => {
        setPanelVisible(!panelVisible)
    }

    const handleClosePanel = () => {
        setPanelVisible(false)
    }

    const handleNewChat = () => {
        // 新建对话时的额外处理（可选）
        console.log("新建对话")
    }

    return (
        <div className="min-h-screen bg-background">
            {/* 页面头部 */}
            <div className="border-b bg-muted/30">
                <div className="container mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold mb-2">数据分析工作台</h1>
                    <p className="text-muted-foreground">
                        实时业务数据监控与分析，AI 助手随时为您解答数据问题
                    </p>
                </div>
            </div>

            {/* 主要内容区域 */}
            <div className="container mx-auto px-4 py-8">
                {/* 统计卡片网格 */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {statsCards.map((stat, index) => {
                        const Icon = stat.icon
                        const isPositive = stat.change > 0

                        return (
                            <Card key={index}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {stat.title}
                                    </CardTitle>
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stat.value}</div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        {isPositive ? (
                                            <ArrowUpRight className="h-3 w-3 text-green-500" />
                                        ) : (
                                            <ArrowDownRight className="h-3 w-3 text-red-500" />
                                        )}
                                        <span
                                            className={
                                                isPositive ? "text-green-500" : "text-red-500"
                                            }
                                        >
                                            +{stat.change}%
                                        </span>
                                        <span>{stat.description}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {/* 数据图表区域占位 */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>收入趋势</CardTitle>
                            <CardDescription>近 30 天收入变化趋势</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg">
                                <p className="text-muted-foreground">
                                    图表区域（可集成 ECharts/Recharts）
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="col-span-3">
                        <CardHeader>
                            <CardTitle>实时销售</CardTitle>
                            <CardDescription>最近订单动态</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map((item) => (
                                    <div
                                        key={item}
                                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">
                                                订单 #{1000 + item}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                客户 {item} 号
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">
                                                ${(100 + item * 50).toFixed(2)}
                                            </p>
                                            <p className="text-xs text-green-500">已完成</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 悬浮 AI 助手 */}
            <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3">
                {/* 聊天面板 */}
                <Entrance
                    visible={panelVisible}
                    onClose={handleClosePanel}
                    onNewChat={handleNewChat}
                    agentPresets={[
                        {
                            name: "数据分析助手",
                            description: "专注于数据分析、可视化、业务洞察",
                            faq: WELCOME_QUESTIONS
                        }
                    ]}
                />

                {/* 悬浮图标 */}
                <HoverIcon onClick={handleIconClick} disabled={false} />
            </div>
        </div>
    )
}
