/**
 *  chat store 公共类型定义
 */

import type { CRequestOptions } from "../request"

/** 流式事件类型 */
export type SSEEventType =
    | 'message' // 正常文本输出
    | 'thinking' // 思考过程（reasoning token）
    | 'error' // 服务端错误
    | 'done' // 流结束信号

export type SSEEventHandler = (data: Record<string, any>) => void

export type MessageType = 'text' | 'image' | 'markdown' | 'file'

/** 附件 文件 */
export interface FileItem {
    uid: string
    name: string
    url?: string
    size?: number
    mimeType?: string
}

/** 单条子消息内容 */
export interface MessageContent {
    /** 文本 / markdown内容 */
    content: string
    /** 消息类型 */
    msgType: MessageType
    /** 附件 文件列表 */
    fileList?: FileItem[]
    /** 思考过程（reasoning token） */
    thinking?: string
    /** 是否正在思考 */
    isThinking?: boolean
    /** 是否正在加载 */
    loading?: boolean
    /** 思考耗时（毫秒） */
    thinkingDuration?: number
}


/** 消息类型 */
export interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    /** 多版本消息内容列表 */
    children: MessageContent[]
    /** 当前展示的子消息索引 */
    currentIndex: number
    /** 消息创建时间 */
    timestamp: number
    feedback?: 'like' | 'dislike' | null
}

/** 会话类型 */
export interface Conversation {
    id: string
    title: string
    messages: ChatMessage[]
    /** 会话创建时间 */
    createdAt: number
}

/** 会话管理 slice状态 + 操作函数 */
export interface ConversationSlice {
    conversations: Conversation[]
    activeConversationId?: string | null

    /** 获取当前激活的会话 */
    getActiveConversation: () => Conversation | undefined
    /** 创建新会话 */
    createConversation: () => string
    /** 切换到指定会话 */
    setActiveConversation: (id: string) => void
    /** 删除会话 */
    deleteConversation: (id: string) => void
    /** 重命名会话 */
    renameConversation: (id: string, title: string) => void
}

export interface UploadingFile {
    uid: string
    name: string
    size?: number
    mimeType?: string
    status?: 'uploading' | 'done' | 'failed'
    progress?: number
    /** 预览图片URL, 仅对图片文件有效 */
    previewUrl?: string
    /** 上传完成的文件对象，用于发送到服务器 */
    file?: File
    errorMessage?: string
}

export interface FileSlice {
    /** 待上传文件列表 */
    pendingFiles: UploadingFile[]
    /** 是否正在上传文件 */
    isUploading: boolean
    /** 添加待上传文件 */
    addFiles: (files: File[]) => void
    /** 删除文件 */
    removeFile: (uid: string) => void
    /** 清空所有待上传文件 */
    clearFiles: () => void
    /** 获取已上传文件列表 */
    getReadyFiles: () => FileItem[]
}

/** 消息管理 slice 状态 + 操作函数 */
export interface MessageSlice {
    /** 设置消息反馈 */
    setMessageFeedback: (id: string, feedback: 'like' | 'dislike' | null) => void
    /** 切换消息的展示版本 */
    switchMessageVersion: (id: string, direction: 'prev' | 'next') => void
    /** 编辑用户消息，删除该消息之后的所有消息 */
    editMessage: (messageId: string, newContent: string) => number
    /** 设置正在编辑的消息 ID */
    setEditingMessageId: (messageId: string | null) => void
    /** 获取当前正在编辑的消息 ID */
    getEditingMessageId: () => string | null
    /** 设置编辑内容 */
    setEditContent: (content: string) => void
    /** 获取当前正在编辑的消息索引位置 */
    getEditingMessageIndex: () => number
}

/** 流式请求管理 slice状态 + 操作函数 */
export interface StreamSlice {
    isStreaming: boolean

    /** 发送消息（触发流式请求）,可附带文件 */
    sendMessage: (content: string, requestOptions: CRequestOptions, fileList?: FileItem[]) => void
    /** 中止当前流式请求 */
    abortStream: () => void
    /** 重新生成最后一条回复 */
    regenerateLastMessage: (requestOptions: CRequestOptions) => void
}

/** 全局操作处理函数 */
export type OperationHandler = (...args: any[]) => any

/** 全局操作注册slice */
export interface OperationSlice {
    /** 操作注册表 */
    operationsMap: Record<string, OperationHandler>
    /** 注册操作 */
    registerOperation: (name: string, handler: OperationHandler) => void
    /** 注销操作 */
    unregisterOperation: (name: string) => void
    /** 获取已注册的操作处理函数 */
    getOperation: (name: string) => OperationHandler | undefined
    /** 批量注册操作 */
    registerOperations: (operations: Record<string, OperationHandler>) => void
    /** 清空所有操作 */
    clearOperations: () => void
}

/** 完整的 ChatStore 类型 = Slice 聚合 + 全局状态 */
export type ChatStore = ConversationSlice & MessageSlice & StreamSlice & FileSlice & OperationSlice & {
    /** 当前正在编辑的消息 ID */
    editingMessageId?: string | null
    /** 当前编辑的内容 */
    editContent?: string
    /** 当前正在编辑的消息索引位置 */
    editingMessageIndex?: number
    /** 当前选择的 provider */
    provider: string
    /** 设置 provider */
    setProvider: (provider: string) => void
}
