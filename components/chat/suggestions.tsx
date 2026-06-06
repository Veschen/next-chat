'use client'

import React from 'react'
import { Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SuggestionItem } from '@/lib/types'

interface SuggestionsProps {
    items: SuggestionItem[]
    onSelect: (prompt: string) => void
    className?: string
}

export function Suggestions({ items, onSelect, className }: SuggestionsProps) {
    return (
        <div className={cn("flex flex-wrap gap-2 px-4 py-2", className)}>
            <Lightbulb className="w-4 h-4 text-mute-foreground shrink-0 mt-1.5" />
            {items.map((item) => (
                <button
                    key={item.prompt}
                    onClick={() => onSelect(item.prompt)}
                    className={cn("inline-flex items-center rounded-full border border-border ",
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