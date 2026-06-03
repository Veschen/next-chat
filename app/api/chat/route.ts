/**
 * LLM API Route -多provider代理层
 * 
 *  支持的协议格式：
 * - mock （默认）
 * - openai openai 兼容格式
 * - ollama ollama 协议 NDJSON 格式
 * 
 *  切换方式：修改 ACTIVE_PROVIDER 环境变量
 */

type ProviderType = 'mock' | 'openai' | 'ollama'

const DEFAULT_PROVIDER: ProviderType = (process.env.ACTIVE_PROVIDER as ProviderType) || 'mock'

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

const MOCK_REPLY =
    '你好！我是一个智能助手。\n\n' +
    '我可以帮你完成以下任务：\n\n' +
    '1. **代码编写** - 支持多种编程语言\n' +
    '2. **文档编写** - 生成专业文档\n' +
    '3. **数据可视化** - 帮助分析数据\n' +
    '4. **问题解决** - 提供问题解决建议\n' +
    '5. **其他任务** - 其他类型的任务，如数据处理、文本分析等\n\n' +
    '```typescript\n' +
    'console.log("hello world")\n' +
    '``` \n\n' +
    '切换到真实 API TODO 待实现'

function enqueueSSE(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, content: string) {
    const sseData = JSON.stringify({ content })
    controller.enqueue(encoder.encode(`event: delta\ndata: ${sseData}\n\n`))
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

async function handleMock(messages: Array<{ role: string, content: string }>) {
    const userMessage = messages[messages.length - 1]?.content || ''
    const replayText = `你说的是「 ${userMessage} 」对吧？\n\n${MOCK_REPLY}`

    const encoder = new TextEncoder()
    const chunks = splitIntoChunks(replayText, 2)
    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            for (const chunk of chunks) {
                await delay(50 + Math.random() * 80)
                enqueueSSE(controller, encoder, chunk)
            }
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
    parseLine: (line: string) => string | null,
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
                    enqueueSSE(controller, encoder, `API错误： ${response.status}: ${errorText}`)
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
                        const content = parseLine(line)
                        if (content === '[DONE]') break
                        if (content) {
                            enqueueSSE(controller, encoder, content)
                        }
                    }
                }
                if (buffer.trim()) {
                    const content = parseLine(buffer)
                    if (content && content !== '[DONE]') {
                        enqueueSSE(controller, encoder, content)
                    }
                }
                controller.close()
            } catch (error) {
                const message = error instanceof Error ? error.message : '未知错误'
                enqueueSSE(controller, encoder, `请求失败： ${message}`)
                controller.close()
            }
        }
    })
    return sseResponse(stream)
}

/**
 * 解析OpenAI流式响应
 */
function parseOpenAILine(line: string): string | null {
    const trimmedLine = line.trim()
    if (!trimmedLine || !trimmedLine.startsWith('data:')) {
        return null
    }
    const data = trimmedLine.slice(5).trim()
    if (data === '[DONE]') return '[DONE]'

    try {
        return JSON.parse(data).choices[0]?.delta?.content || null
    } catch {
        return null
    }
}

/**
 * 解析Ollama流式响应
 */
function parseOllamaLine(line: string) {
    if (!line.trim()) return null
    try {
        return JSON.parse(line).response || null
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
            enqueueSSE(controller, encoder, `⚠️ ${message}`)
            controller.close()
        }
    })
    return sseResponse(stream)
}