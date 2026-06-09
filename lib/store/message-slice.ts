/**
 * 消息管理 slice
 * 职责： 消息反馈（点赞 点踩）、多版本切换、编辑状态管理
 */
import type { StateCreator } from "zustand"
import type { MessageSlice, ChatStore } from "./types"

export const createMessageSlice: StateCreator<
    ChatStore,
    [['zustand/immer', never], ['zustand/devtools', never]],
    [],
    MessageSlice
>
    = (set, get) => ({
        editingMessageId: null,
        editingMessageIndex: -1,
        editContent: '',
        setMessageFeedback: (id: string, feedback: 'like' | 'dislike' | null) => {
            set((state) => {
                for (const c of state.conversations) {
                    const message = c.messages.find(msg => msg.id === id)
                    if (message) {
                        message.feedback = message.feedback === feedback ? null : feedback
                        break
                    }
                }
            }, false, 'message/setFeedback')
        },
        switchMessageVersion: (id: string, direction: 'prev' | 'next') => {
            set((state) => {
                for (const c of state.conversations) {
                    const message = c.messages.find(msg => msg.id === id)
                    if (message) {
                        const totalVersions = message.children?.length ?? 0
                        if (totalVersions <= 1) break

                        if (direction === 'prev') {
                            // 用 Math.max 确保索引不小于 0，避免越界
                            message.currentIndex = Math.max(0, message.currentIndex - 1)
                        } else {
                            // 用 Math.min 确保索引不大于 totalVersions - 1，避免越界
                            message.currentIndex = Math.min(totalVersions - 1, message.currentIndex + 1)
                        }
                        break
                    }
                }
            }, false, 'message/switchVersion')
        },
        /**
         * 编辑用户消息
         * @param messageId 要编辑的消息 ID
         * @param newContent 新的消息内容
         * @returns 编辑后的消息索引位置，用于后续重新发送
         */
        editMessage: (messageId: string, newContent: string): number => {
            let messageIndex = -1
            set((state) => {
                for (const c of state.conversations) {
                    const messageIndexInConv = c.messages.findIndex(msg => msg.id === messageId)
                    if (messageIndexInConv !== -1) {
                        const message = c.messages[messageIndexInConv]
                        // 更新消息内容
                        const child = message.children[message.currentIndex]
                        if (child) {
                            child.content = newContent
                        }
                        // 删除该消息之后的所有消息
                        c.messages = c.messages.slice(0, messageIndexInConv + 1)
                        // 更新会话标题（如果是第一条消息）
                        if (messageIndexInConv === 0) {
                            c.title = newContent.slice(0, 20) + (newContent.length > 20 ? '...' : '')
                        }
                        messageIndex = messageIndexInConv
                        // 保存编辑消息的索引位置
                        state.editingMessageIndex = messageIndexInConv
                        break
                    }
                }
            }, false, 'message/editMessage')
            return messageIndex
        },
        /**
         * 设置正在编辑的消息 ID（确保同时只有一个消息在编辑）
         */
        setEditingMessageId: (messageId: string | null) => {
            set((state) => {
                state.editingMessageId = messageId
            }, false, 'message/setEditingMessageId')
        },
        /**
         * 获取当前正在编辑的消息 ID
         */
        getEditingMessageId: () => {
            return get().editingMessageId ?? null
        },
        /**
         * 设置编辑内容
         */
        setEditContent: (content: string) => {
            set((state) => {
                state.editContent = content
            }, false, 'message/setEditContent')
        },
        /**
         * 获取当前正在编辑的消息索引位置
         */
        getEditingMessageIndex: () => {
            return get().editingMessageIndex ?? -1
        },
    })