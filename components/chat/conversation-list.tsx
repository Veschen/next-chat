'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Plus, Trash2, MessageSquare, Check, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'
import type { Conversation } from '@/lib/store/types'

interface ConversationListProps {
    conversations: Conversation[]
    activeId?: string | null
    onSelect: (id: string) => void
    onCreate: () => void
    onDelete: (id: string) => void
    onRename: (id: string, title: string) => void
}

interface ConversationItemProps {
    conversation: Conversation
    isActive: boolean
    onSelect: () => void
    onDelete: () => void
    onRename: (title: string) => void
}

interface TimeGroup {
    label: string
    conversations: Conversation[]
}

function isToday(timestamp: number) {
    const date = new Date(timestamp)
    const today = new Date()
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
}

function isYesterday(timestamp: number) {
    const date = new Date(timestamp)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return date.getFullYear() === yesterday.getFullYear() && date.getMonth() === yesterday.getMonth() && date.getDate() === yesterday.getDate()
}

/** 将会话列表按时间分组 今天、昨天、更早 */
function groupByTime(conversations: Conversation[]): TimeGroup[] {
    const groups: TimeGroup[] = []
    const todayList: Conversation[] = []
    const yesterdayList: Conversation[] = []
    const earlierList: Conversation[] = []

    // 按创建时间倒序排列
    const sorted = [...conversations].sort((a, b) => b.createdAt - a.createdAt)

    for (const conversation of sorted) {
        if (isToday(conversation.createdAt)) {
            todayList.push(conversation)
        } else if (isYesterday(conversation.createdAt)) {
            yesterdayList.push(conversation)
        } else {
            earlierList.push(conversation)
        }
    }
    // 按时间分组
    if (todayList.length > 0) {
        groups.push({ label: '今天', conversations: todayList })
    }
    if (yesterdayList.length > 0) {
        groups.push({ label: '昨天', conversations: yesterdayList })
    }
    if (earlierList.length > 0) {
        groups.push({ label: '更早', conversations: earlierList })
    }
    return groups
}

/** 单个会话条目 */
function ConversationItem({
    conversation,
    isActive,
    onSelect,
    onDelete,
    onRename,
}: ConversationItemProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(conversation.title)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus()
            inputRef.current?.select()
        }
    }, [isEditing])

    const confirmRename = useCallback(() => {
        const trimmedValue = editValue.trim()
        if (trimmedValue && trimmedValue !== conversation.title) {
            onRename(trimmedValue)
        }
        setIsEditing(false)
    }, [conversation.title, editValue, onRename])

    const cancelRename = useCallback(() => {
        setEditValue(conversation.title)
        setIsEditing(false)
    }, [conversation.title])

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        setEditValue(conversation.title)
        setIsEditing(true)
    }, [conversation.title])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            confirmRename()
        } else if (e.key === 'Escape') {
            cancelRename()
        }
    }, [confirmRename, cancelRename])

    if (isEditing) {
        return (
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm bg-background shadow-sm">
                <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={confirmRename}
                    className="flex-1 w-0 h-7 px-1.5 text-sm"
                    maxLength={50}
                />
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={confirmRename}>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onMouseDown={(e) => { e.preventDefault(); cancelRename() }}>
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
            </div>
        )
    }
    return (
        <div
            onClick={onSelect}
            onDoubleClick={handleDoubleClick}
            className={cn('flex group items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors',
                isActive ? 'bg-background shadow-sm' : 'hover:bg-background/60')}
        >

            <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 w-24 truncate">{conversation.title}</span>
            <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                }}
                className="group-hover:opacity-100 transition-opacity h-6 w-6 shrink-0 opacity-0 "
            >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
        </div>
    )
}

export function ConversationList({ conversations, activeId, onSelect, onCreate, onDelete, onRename }: ConversationListProps) {
    const groups = useMemo(() => groupByTime(conversations), [conversations])
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
                        <div className="space-y-3">
                            {
                                groups.map((group) => (
                                    <div key={group.label} >
                                        <div className="text-xs px-3 py-1.5 font-medium text-muted-foreground">
                                            {group.label}
                                        </div>
                                        <div className="space-y-1">
                                            {
                                                group.conversations.map((c) => (
                                                    <ConversationItem
                                                        key={c.id}
                                                        conversation={c}
                                                        isActive={c.id === activeId}
                                                        onSelect={() => onSelect(c.id)}
                                                        onDelete={() => onDelete(c.id)}
                                                        onRename={(title) => onRename(c.id, title)} />
                                                ))
                                            }
                                        </div>
                                    </div>))
                            }
                        </div>
                    )
                }
            </ScrollArea >
        </div >
    )
}
