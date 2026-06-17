"use client"

import { Lightbulb, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SuggestionItem } from "@/lib/types"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface SuggestionsProps {
    items: SuggestionItem[]
    onSelect: (prompt: string) => void
    className?: string
    mode?: "default" | "dropdown"
}

export function Suggestions({ items, onSelect, className, mode = "default" }: SuggestionsProps) {
    // Dropdown 模式：单个按钮展开菜单
    if (mode === "dropdown") {
        return (
            <div className={cn("px-4 py-2", className)}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs gap-1.5 rounded-full border-border bg-background hover:bg-accent hover:text-accent-foreground"
                        >
                            <Lightbulb className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>继续提问</span>
                            <ChevronDown className="w-3 h-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                        {items.map((item) => (
                            <DropdownMenuItem
                                key={item.prompt}
                                onClick={() => onSelect(item.prompt)}
                                className="text-xs"
                            >
                                {item.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        )
    }

    // 默认模式：多个按钮
    return (
        <div className={cn("flex flex-wrap gap-2 px-4 py-2", className)}>
            <Lightbulb className="w-4 h-4 text-muted-foreground shrink-0 mt-1.5" />
            {items.map((item) => (
                <button
                    key={item.prompt}
                    onClick={() => onSelect(item.prompt)}
                    className={cn(
                        "inline-flex items-center rounded-full border border-border ",
                        "bg-background px-3 py-1.5 text-xs text-foreground shadow-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground active:scale-95"
                    )}
                >
                    {item.label}
                </button>
            ))}
        </div>
    )
}
