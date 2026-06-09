'use client'

import React, { useEffect, useRef } from 'react'
import { Command } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ShortcutItem } from '@/lib/types'

interface ShortcutListProps {
    items: ShortcutItem[]
    visible: boolean
    activeIndex: number
    onSelect: (item: ShortcutItem) => void
}

export function ShortcutList({ items, visible, activeIndex, onSelect }: ShortcutListProps) {
    const listRef = useRef<HTMLDivElement>(null)
    const activeItemRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        // 
        activeItemRef.current?.scrollIntoView({ block: 'nearest' })
    }, [activeIndex])

    if (!visible || items.length === 0) return null

    return (
        <div
            ref={listRef}
            className={cn("absolute bottom-full left-0 right-0 mb-1 max-h-52 flex flex-col overflow-auto rounded-xl border bg-popover ",
                "shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-150")}>
            <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
                <Command className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">快捷指令</span>
            </div>
            <div className="p-1 overflow-auto">
                {items.map((item, index) => (
                    <button
                        ref={index === activeIndex ? activeItemRef : null}
                        key={item.label}
                        className={cn('flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                            index === activeIndex
                                ? 'bg-accent text-accent-foreground'
                                : 'hover:bg-accent/50')}
                        onClick={() => onSelect(item)}>
                        <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">/{item.label}</span>
                            <span className="text-xs text-muted-foreground truncate">
                                {item.description}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}