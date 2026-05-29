/**
 * 用于模拟SSE API，返回流式响应
 * 仅用于测试
 */

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
    '有什么我可以帮助你的吗？🥰'

export async function POST(req: Request) {
    const body = await req.json()
    const userMessage =
        body.userMessage?.[body.messages.length - 1]?.content || ''

    const replayText = userMessage
        ? `你说的是「 ${userMessage} 」对吧？\n\n${MOCK_REPLY}`
        : MOCK_REPLY

    const encoder = new TextEncoder()
    const chunks = splitIntoChunks(replayText, 2)
    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            for (let i = 0; i < chunks.length; i++) {
                await delay(50 + Math.random() * 80)
                const sseData = JSON.stringify({ content: chunks[i] })
                const sseEvent = `event: delta\ndata: ${sseData}\n\n`
                controller.enqueue(encoder.encode(sseEvent))
            }
            controller.close()
        }
    })
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    })
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