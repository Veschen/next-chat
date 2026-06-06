/**
 * LLM API Route -多provider代理层
 * 
 *  支持的协议格式：
 * - mock （默认）
 * - openai openai 兼容格式
 * - ollama ollama 协议 NDJSON 格式
 */
import {
    MOCK_THINKING,
    MOCK_REPLY,
    MOCK_CALORIE_THINKING,
    MOCK_CALORIE_REPLY,
    MOCK_CODE_THINKING,
    MOCK_CODE_REPLAY,
    MOCK_TABLE_THINKING,
    MOCK_TABLE_REPLAY,
    MOCK_MERMAID_THINKING,
    MOCK_MERMAID_REPLAY,
    MOCK_MATH_THINKING,
    MOCK_MATH_REPLAY,
} from './mock-data'

type ProviderType = 'mock' | 'openai' | 'ollama'

interface ParsedChunk {
    content: string
    event: 'message' | 'thinking'
}

/** 流结束信号事件 */
const DONE_SIGNAL = '[DONE]' as const

const DEFAULT_PROVIDER: ProviderType = 'mock'

const PROVIDER_CONFIG = {
    mock: {},
    openai: {
        baseUrl: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'qwen-max',
    },
    ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'https://mlvoca.com/api/generate',
        model: process.env.OLLAMA_MODEL || 'deepseek-r1:1.5b',
    },
} as const

function enqueueSSE(
    controller: ReadableStreamDefaultController<Uint8Array>,
    encoder: TextEncoder,
    content: string,
    event: 'message' | 'thinking' | 'error' | 'done' = 'message'
) {
    const sseData = JSON.stringify({ content })
    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${sseData}\n\n`))
}

function sseResponse(stream: ReadableStream) {
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    })
}

export async function POST(req: Request) {
    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider') || DEFAULT_PROVIDER
    if (!provider) {
        return errorResponse('provider 不能为空')
    }
    const body = await req.json()
    const messages: Array<{ role: string, content: string }> = body.messages || []

    switch (provider) {
        case 'mock':
            return handleMock(messages)
        case 'openai':
            return handleOpenAI(messages)
        case 'ollama':
            return handleOllama(messages)
        default:
            return handleMock(messages)
    }
}

const MOCK_SCENARIOS: Array<{
    pattern: RegExp,
    thinking: string,
    reply: string
    chunkSize: number
}> = [
        { 
            pattern: /热量|饮食|卡路里/, 
            thinking: MOCK_CALORIE_THINKING, 
            reply: MOCK_CALORIE_REPLY,
            chunkSize: 20 
        },
        { 
            pattern: /代码|code|函数/, 
            thinking: MOCK_CODE_THINKING, 
            reply: MOCK_CODE_REPLAY,
            chunkSize: 10 
        },
        { 
            pattern: /表格|排行|对比/, 
            thinking: MOCK_TABLE_THINKING, 
            reply: MOCK_TABLE_REPLAY,
            chunkSize: 12 
        },
        { 
            pattern: /图表|可视化|流程图/, 
            thinking: MOCK_MERMAID_THINKING, 
            reply: MOCK_MERMAID_REPLAY,
            chunkSize: 15 
        },
        { 
            pattern: /数学|公式|方程/, 
            thinking: MOCK_MATH_THINKING, 
            reply: MOCK_MATH_REPLAY,
            chunkSize: 10
        },
    ]

async function handleMock(messages: Array<{ role: string, content: string }>) {
    const userMessage = messages[messages.length - 1]?.content || ''

    // 匹配关键词 返回mock数据
    const matched = MOCK_SCENARIOS.find(scenario => scenario.pattern.test(userMessage))
    const thinking = matched?.thinking || MOCK_THINKING

    const randomReply = MOCK_REPLY[Math.floor(Math.random() * MOCK_REPLY.length)]
    const replyText = matched?.reply || `你说的是「 ${userMessage} 」对吧？\n\n${randomReply}`
    const chunkSize = matched?.chunkSize || 4

    const encoder = new TextEncoder()
    const thinkingChunks = splitIntoChunks(thinking, 3)
    const messageChunks = splitIntoChunks(replyText, chunkSize)

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            // 阶段1 发送思考过程（reasoning token）事件
            for (const chunk of thinkingChunks) {
                await delay(40 + Math.random() * 60)
                enqueueSSE(controller, encoder, chunk, 'thinking')
            }
            // 阶段2 发送正常文本输出事件
            for (const chunk of messageChunks) {
                await delay(30 + Math.random() * 50)
                enqueueSSE(controller, encoder, chunk, 'message')
            }
            // 阶段3 发送流结束信号
            enqueueSSE(controller, encoder, '', 'done')
            controller.close()
        }
    })
    return sseResponse(stream)
}

/**
 * 处理OpenAI请求
 */
async function handleOpenAI(messages: Array<{ role: string, content: string }>) {
    const config = PROVIDER_CONFIG.openai

    if (!config.apiKey) {
        return errorResponse('OpenAI API Key 为空')
    }

    return proxyStream(config.baseUrl, {
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: config.model,
            messages,
            stream: true,
        }),
    }, parseOpenAILine)
}

/**
 * 处理Ollama请求
 */
async function handleOllama(messages: Array<{ role: string, content: string }>) {
    const config = PROVIDER_CONFIG.ollama

    // Ollama 协议只支持单prompt，将多轮消息拼接
    const prompt = messages.map((msg) => (msg.role === 'user' ? `User: ${msg.content}` : `Assistant: ${msg.content}`))
        .join('\n') + `\nAssistant:` // 最后添加Assistant： 告诉model，到你回复了

    return proxyStream(config.baseUrl, {
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: config.model,
            prompt,
            stream: true,
        }),
    }, parseOllamaLine)
}

/**
 * 代理流式响应
 */
async function proxyStream(
    url: string,
    init: { headers: Record<string, string>; body: string },
    parseLine: (line: string) => ParsedChunk | typeof DONE_SIGNAL | null,
) {
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    ...init,
                })

                if (!response.ok) {
                    const errorText = await response.text()
                    enqueueSSE(controller, encoder, `API错误： ${response.status}: ${errorText}`, 'error')
                    controller.close()
                    return
                }

                const reader = response.body!.getReader()
                const decoder = new TextDecoder()
                let buffer = ''
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        const result = parseLine(line)
                        if (result === DONE_SIGNAL) break
                        if (result) {
                            enqueueSSE(controller, encoder, result.content, result.event)
                        }
                    }
                }
                if (buffer.trim()) {
                    const result = parseLine(buffer)
                    if (result && result !== DONE_SIGNAL) {
                        enqueueSSE(controller, encoder, result.content, result.event)
                    }
                }
                // 发送流结束信号
                enqueueSSE(controller, encoder, '', 'done')
                controller.close()
            } catch (error) {
                const message = error instanceof Error ? error.message : '未知错误'
                enqueueSSE(controller, encoder, `请求失败： ${message}`, 'error')
                controller.close()
            }
        }
    })
    return sseResponse(stream)
}

/**
 * 解析OpenAI流式响应
 */
function parseOpenAILine(line: string): ParsedChunk | typeof DONE_SIGNAL | null {
    const trimmedLine = line.trim()
    if (!trimmedLine || !trimmedLine.startsWith('data:')) {
        return null
    }
    const data = trimmedLine.slice(5).trim()
    if (data === DONE_SIGNAL) return DONE_SIGNAL

    try {
        const delta = JSON.parse(data).choices[0]?.delta
        if (!delta) return null

        if (delta.reasoning_content) {
            return { content: delta.reasoning_content, event: 'thinking' }
        }
        if (delta.content) {
            return { content: delta.content, event: 'message' }
        }

        return null
    } catch {
        return null
    }
}

/**
 * 解析Ollama流式响应
 */
function parseOllamaLine(line: string): ParsedChunk | typeof DONE_SIGNAL | null {
    if (!line.trim()) return null
    try {
        const response = JSON.parse(line).response
        if (!response) return null

        return { content: response, event: 'message' }
    } catch {
        return null
    }
}

/**
 * 将文本分割成指定大小的块
 * 用于模拟流式响应
 */
function splitIntoChunks(text: string, chunkSize: number): string[] {
    const result: string[] = []
    for (let i = 0; i < text.length; i += chunkSize) {
        result.push(text.substring(i, i + chunkSize))
    }
    return result
}

/**
 * 模拟异步延迟
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function errorResponse(message: string) {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
        start(controller) {
            enqueueSSE(controller, encoder, `⚠️ ${message}`, 'error')
            controller.close()
        }
    })
    return sseResponse(stream)
}