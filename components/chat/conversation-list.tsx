'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Plus, Trash2, MessageSquare } from 'lucide-react'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import type { Conversation } from '@/lib/use-chat'

interface ConversationListProps {
    conversations: Conversation[]
    activeId?: string | null
    onSelect: (id: string) => void
    onCreate: () => void
    onDelete: (id: string) => void
}

export function ConversationList({ conversations, activeId, onSelect, onCreate, onDelete }: ConversationListProps) {
    return (
        <div className="flex flex-col h-full bg-secondary/50">
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-sm font-semibold">会话列表</h2>
                <Button size="icon" variant="ghost" onClick={onCreate} className="h-8 w-8">
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
            {/* 列表 */}
            <ScrollArea className="flex-1 P-2">
                {
                    conversations.length === 0 ? (
                        <div className="text-center text-muted-foreground text-sm py-8">暂无会话</div>
                    ) : (
                        <div className="space-y-1">
                            {
                                conversations.map((conversation) => (
                                    <div
                                        key={conversation.id}
                                        onClick={() => onSelect(conversation.id)}
                                        className={cn('flex group items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors',
                                            activeId === conversation.id ? 'bg-background shadow-sm' : 'hover:bg-background/60'
                                        )}>
                                        <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                                        <span className="flex-1 w-24 truncate">{conversation.title}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                onDelete(conversation.id)
                                                e.stopPropagation()
                                            }}
                                            className="group-hover:opacity-100 transition-opacity h-6 w-6 shrink-0 opacity-0 "
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                                        </Button>
                                    </div>
                                ))
                            }
                        </div>
                    )
                }
            </ScrollArea>
        </div>
    )
}
