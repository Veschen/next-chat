export function remend(content: string): string {
    let result = content
    
    result = fixUnclosedInlineCode(result)
    result = fixUnclosedBoldAndItalic(result)
    result = fixUnclosedLinks(result)
    result = fixTableSeparatorRow(result)
    result = fixUnclosedHtmlTags(result)
    result = fixUnclosedMath(result)
    
    return result
}

function fixUnclosedBoldAndItalic(content: string): string {
    let result = content
    
    const lines = result.split('\n')
    const fixedLines: string[] = []
    
    for (let line of lines) {
        if (/^\s*\d+\.\s*/.test(line)) {
            fixedLines.push(line)
            continue
        }
        
        if (/^\s*[-*+]\s+/.test(line)) {
            const match = line.match(/^\s*[-*+]\s+/)
            if (match) {
                const prefix = match[0]
                let rest = line.slice(prefix.length)
                
                const boldPattern = /\*\*(?![^\*]*\*\*)/g
                rest = rest.replace(boldPattern, '')
                
                const italicPattern = /\*(?!([^\*]|\*\*)*\*)/g
                const matches = [...rest.matchAll(italicPattern)]
                if (matches.length % 2 !== 0) {
                    const lastMatch = matches[matches.length - 1]
                    if (lastMatch.index !== undefined) {
                        rest = rest.slice(0, lastMatch.index) + rest.slice(lastMatch.index + 1)
                    }
                }
                
                fixedLines.push(prefix + rest)
                continue
            }
        }
        
        const boldPattern = /\*\*(?![^\*]*\*\*)/g
        line = line.replace(boldPattern, '')
        
        const italicPattern = /\*(?!([^\*]|\*\*)*\*)/g
        const matches = [...line.matchAll(italicPattern)]
        if (matches.length % 2 !== 0) {
            const lastMatch = matches[matches.length - 1]
            if (lastMatch.index !== undefined) {
                line = line.slice(0, lastMatch.index) + line.slice(lastMatch.index + 1)
            }
        }
        
        fixedLines.push(line)
    }
    
    return fixedLines.join('\n')
}

function fixUnclosedInlineCode(content: string): string {
    const parts = content.split(/(```[\s\S]*?```)/g)
    let result = ''
    
    for (const part of parts) {
        if (part.startsWith('```') && part.endsWith('```')) {
            result += part
            continue
        }
        
        const backtickPattern = /`/g
        const matches = [...part.matchAll(backtickPattern)]
        
        if (matches.length % 2 !== 0) {
            const lastMatch = matches[matches.length - 1]
            if (lastMatch.index !== undefined) {
                result += part.slice(0, lastMatch.index) + part.slice(lastMatch.index + 1)
            }
        } else {
            result += part
        }
    }
    
    return result
}

function fixUnclosedLinks(content: string): string {
    let result = content
    
    const linkPattern = /\[([^\]]*)\](?!\()/g
    result = result.replace(linkPattern, '$1')
    
    const imagePattern = /!\[([^\]]*)\](?!\()/g
    result = result.replace(imagePattern, '$1')
    
    return result
}

function fixTableSeparatorRow(content: string): string {
    const lines = content.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.match(/^[\s|:-]+$/)) {
            if (i === 0 || !lines[i - 1].includes('|')) {
                lines[i] = ''
            }
        }
    }
    
    return lines.join('\n')
}

function fixUnclosedHtmlTags(content: string): string {
    const parts = content.split(/(```[\s\S]*?```)/g)
    let result = ''
    
    for (const part of parts) {
        if (part.startsWith('```') && part.endsWith('```')) {
            result += part
            continue
        }
        
        const tagStack: string[] = []
        let processed = ''
        let i = 0
        
        while (i < part.length) {
            if (part[i] === '<') {
                const endIndex = part.indexOf('>', i)
                if (endIndex === -1) {
                    processed += part.slice(i)
                    break
                }
                
                const tag = part.slice(i, endIndex + 1)
                const tagNameMatch = tag.match(/^<(\/?)([a-zA-Z][a-zA-Z0-9]*)/)
                
                if (tagNameMatch) {
                    const [, closing, tagName] = tagNameMatch
                    const lowerTagName = tagName.toLowerCase()
                    
                    const selfClosingTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
                    
                    if (!closing && !selfClosingTags.has(lowerTagName)) {
                        tagStack.push(lowerTagName)
                        processed += tag
                    } else if (closing) {
                        const lastOpenTag = tagStack.pop()
                        if (lastOpenTag === lowerTagName) {
                            processed += tag
                        }
                    } else {
                        processed += tag
                    }
                } else {
                    processed += tag
                }
                i = endIndex + 1
            } else {
                processed += part[i]
                i++
            }
        }
        
        result += processed
    }
    
    return result
}

function fixUnclosedMath(content: string): string {
    let result = content
    
    const blockMathPattern = /\$\$(?!.*\$\$)/g
    result = result.replace(blockMathPattern, '')
    
    return result
}

export function holdBackPartialMarkers(content: string): string {
    let result = content
    
    const setextPattern = /\n[=-]{1,2}$/
    if (setextPattern.test(result)) {
        const match = result.match(setextPattern)
        if (match) {
            result = result.slice(0, result.length - match[0].length)
        }
    }
    
    const trailingBackticks = result.match(/`{1,2}$/)
    if (trailingBackticks) {
        result = result.slice(0, result.length - trailingBackticks[0].length)
    }
    
    return result
}