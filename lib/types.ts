/**
 * 全局共享类型定义
 */

/** 快捷指令项 */
export interface ShortcutItem {
    /** 快捷指令标签 */
    label: string
    /** 快捷指令描述 */
    description: string
    /** 快捷指令提示 */
    prompt: string
}

export interface QuestionItem {
    /** 问题标签 */
    label: string
    /** 问题图标 */
    icon: string
    /** 问题提示 */
    prompt: string
}

export const WELCOME_QUESTIONS = ["你好，我是你的智能助手，我可以帮助你解决各种问题。"]

/** 建议项 */
export interface SuggestionItem {
    /** 建议标签 */
    label: string
    /** 建议提示 */
    prompt: string
}
