import { marked } from 'marked'

export interface MarkdownBlock {
    key: string
    content: string
    type: 'paragraph' | 'code' | 'heading' | 'list' | 'blockquote' | 'html' | 'table' | 'other'
    isIncomplete: boolean
    startIndex: number
    endIndex: number
}

const BLOCK_TYPE_MAP: Record<string, MarkdownBlock['type']> = {
    paragraph: 'paragraph',
    code: 'code',
    heading: 'heading',
    list: 'list',
    blockquote: 'blockquote',
    html: 'html',
    table: 'table',
}

export function parseMarkdownIntoBlocks(content: string): MarkdownBlock[] {
    const blocks: MarkdownBlock[] = []
    
    if (!content.trim()) {
        return blocks
    }

    const tokens = marked.Lexer.lex(content)
    
    let currentIndex = 0
    let blockIndex = 0
    
    for (const token of tokens) {
        const tokenType = token.type as string
        
        if (tokenType === 'space') {
            currentIndex += (token.raw?.length || 0)
            continue
        }
        
        const blockContent = token.raw || ''
        const startIndex = currentIndex
        const endIndex = currentIndex + blockContent.length
        
        const block: MarkdownBlock = {
            key: `block-${blockIndex++}-${startIndex}-${endIndex}`,
            content: blockContent,
            type: BLOCK_TYPE_MAP[tokenType] || 'other',
            isIncomplete: false,
            startIndex,
            endIndex,
        }
        
        blocks.push(block)
        currentIndex = endIndex
    }

    if (blocks.length > 0) {
        blocks[blocks.length - 1].isIncomplete = true
    }

    return blocks
}

export function findBlockBoundary(content: string, currentPos: number): number {
    const blocks = parseMarkdownIntoBlocks(content)
    
    for (const block of blocks) {
        if (currentPos < block.endIndex) {
            return block.endIndex
        }
    }
    
    return content.length
}