/**
 * SSE流解析管道
 * Uint8Array -> string -> 按“/n/n” 分割事件 -> 按“/n”+ ":" 解析为 key-value 对象
 */
export type SSEOutput = Partial<Record<"event" | "data" | "id" | "retry", string>>

/** 扩展ReadableStream，支持for await of 循环 */
export type AsyncReadableStream<T> = ReadableStream<T> & AsyncIterable<T>

/**
 * 将连续字符串流按“/n/n” 分割为事件流
 *
 *  核心思路
 *  1. 维护buffer，收到新chunk追加后按分隔符“/n/n”分割
 *  2. 完整部分推出，不完整的留在buffer中，等待下一次chunk追加
 */
function splitStream(separator = "\n\n") {
    let buffer = ""
    return new TransformStream<string, string>({
        transform(chunk, controller) {
            buffer += chunk
            const parts = buffer.split(separator)
            // 除了最后一个不确定，其他都是完整的事件
            parts.slice(0, -1).forEach((part) => {
                if (part.trim()) {
                    controller.enqueue(part)
                }
            })
            buffer = parts[parts.length - 1]
        },
        flush(controller) {
            if (buffer.trim()) {
                controller.enqueue(buffer)
            }
        }
    })
}

/**
 *  将单个 SSE 事件解析为 key-value 对象
 *  举例
 *  输入：
 *  "event: message\n data: \"name\": \"张三\", \"age\": 30\n id: 1234567890\n retry: 5000\n\n"
 *  输出：
 *  {event: 'message', data: '{"name": "张三", "age": 30}', id: '1234567890', retry: '5000'}
 */
function splitPart(lineSeparator = "\n", keySeparator = ":") {
    return new TransformStream<string, SSEOutput>({
        transform(partChunk, controller) {
            const lines = partChunk.split(lineSeparator)

            const sseEvent = lines.reduce<SSEOutput>((acc, line) => {
                const colonIndex = line.indexOf(keySeparator)
                if (colonIndex === -1) return acc

                const key = line.slice(0, colonIndex).trim()
                if (!key) return acc

                const value = line.slice(colonIndex + 1).trim()
                return { ...acc, [key]: value }
            }, {})

            if (Object.keys(sseEvent).length > 0) {
                controller.enqueue(sseEvent)
            }
        }
    })
}

/**
 *  创建一个 TextDecoderStream，将 Uint8Array 转换为 string 流
 *  优先使用 TextDecoderStream（性能好），否则使用 TextDecoder
 */
function createDecoderStream(): TransformStream<Uint8Array, string> {
    if (typeof TextDecoderStream !== "undefined") {
        return new TextDecoderStream() as unknown as TransformStream<Uint8Array, string>
    }
    const decoder = new TextDecoder("utf-8")
    return new TransformStream<Uint8Array, string>({
        transform(chunk, controller) {
            controller.enqueue(decoder.decode(chunk, { stream: true }))
        },
        flush(controller) {
            controller.enqueue(decoder.decode())
        }
    })
}

/**
 *  核心入口
 *  将 fetch 响应体转换为 SSE 事件流
 */
export function SStream<Output = SSEOutput>(
    readableStream: ReadableStream<Uint8Array>,
    transformStream?: TransformStream<string, Output>
): AsyncReadableStream<Output> {
    const decoderStream = createDecoderStream()

    const stream = (
        transformStream
            ? readableStream.pipeThrough(decoderStream).pipeThrough(transformStream)
            : readableStream
                  .pipeThrough(decoderStream)
                  .pipeThrough(splitStream())
                  .pipeThrough(splitPart())
    ) as AsyncReadableStream<Output>

    // 扩展 AsyncIterable 接口，支持 for await of 循环
    stream[Symbol.asyncIterator] = async function* () {
        const reader = stream.getReader()
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) {
                yield value
            }
        }
    }
    return stream
}
