"use client"

import React from "react"
import { Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface HoverIconProps {
    onClick?: () => void
    disabled?: boolean
    className?: string
}

/**
 * 悬浮 AI 图标按钮组件
 * 用于在页面右下角展示可点击的 AI 助手入口
 */
export function HoverIcon({ onClick, disabled = false, className }: HoverIconProps) {
    return (
        <Button
            size="icon"
            className={cn(
                "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
                "bg-primary hover:bg-primary/90",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
            onClick={onClick}
            disabled={disabled}
        >
            <Bot className="h-7 w-7 text-primary-foreground" />
        </Button>
    )
}
