/**
 *  流式请求客户端
 *  主要功能：
 *    1. 发送post请求
 *    2. 根据Conten-Type自动路由（SSE流/JSON流）
 *    3. 支持重试策略
 *    4. 流式按chunk消费 + onChange回调
 *    5. 支持超时配置
 */

import { CFetch } from "./fetch"
import { SStream } from "./stream"
import type { SSEOutput, AsyncReadableStream } from "./stream"

/**
 *  流式请求客户端选项
 */
export interface CRequestOptions {
    /** 请求目标 URL */
    baseURL: string
    /** 模型标识，自动注入到请求body */
    model?: string
    /** 自定义 fetch 函数，方便mock */
    fetch?: typeof globalThis.fetch
    /** 请求超时时间，默认10秒，单位：毫秒 */
    timeout?: number
    /** 流超时时间， 两个chunk之间等待时间超过该时间，认为服务端假死，单位：毫秒 */
    streamTimeout?: number
    /** 重试间隔 - 单位：毫秒 */
    retryInterval?: number
    /** 最大重试次数 */
    maxRetries?: number
}

/**
 * 请求参数
 *  - 发给服务端的body
 */
export interface CRequestParams {
    /** 模型标识，自动注入到请求body */
    model?: string
    /** 是否开启流式响应 */
    stream?: boolean
    /** 消息列表 */
    messages?: Array<{ role?: string; content?: string; [key: string]: any }>
    [key: string]: any
}

/**
 * 生命周期回调
 */
export interface CRequestCallbacks<Output = SSEOutput> {
    /** 流式响应更新回调 */
    onUpdate?: (chunk: Output, headers?: Headers) => void
    /** 请求成功回调 */
    onSuccess?: (chunks: Output[], headers?: Headers) => void
    /** 请求失败回调 */
    onError?: (error: Error, headers?: Headers) => void
    /** 流结束回调,拿到abortController，方便手动取消请求 */
    onStream?: (abortController: AbortController) => void
}

/**
 * CRequestClass 类
 *  使用方式
 *  const request = CRequestClass.create({baseURL: '...', model: '...'})
 *  await request.send(params, callbacks)
 */

class CRequestClass {
    private readonly baseURL: string
    private readonly model?: string
    private readonly customFetch?: typeof globalThis.fetch
    private readonly timeout?: number
    private readonly streamTimeout?: number
    private readonly retryInterval?: number
    private readonly maxRetries: number

    private abortController: AbortController | null = null
    private timeoutTimer: ReturnType<typeof setTimeout> | null = null
    private streamTimeoutTimer: ReturnType<typeof setTimeout> | null = null
    private retryTimer: ReturnType<typeof setTimeout> | null = null
    private retryCount = 0
    private lastEventId: string | undefined = undefined
    private isTimeout = false
    private isStreamTimeout = false

    constructor(options: CRequestOptions) {
        this.baseURL = options.baseURL
        this.model = options.model
        this.customFetch = options.fetch
        this.timeout = options.timeout
        this.streamTimeout = options.streamTimeout
        this.retryInterval = options.retryInterval
        this.maxRetries = options.maxRetries ?? 0
    }

    static create(options: CRequestOptions): CRequestClass {
        return new CRequestClass(options)
    }

    /** 终止当前所有请求并清除定时器 */
    abort() {
        this.abortController?.abort()
        this.clearALLTimers()
    }

    /** 发送请求 */
    async send<Output = SSEOutput>(
        params: CRequestParams,
        callbacks?: CRequestCallbacks<Output>,
        transformStream?: TransformStream<string, Output>
    ): Promise<void> {
        this.isTimeout = false
        this.isStreamTimeout = false
        this.abortController = new AbortController()

        // 构建请求头，支持断点续传
        const headers: Record<string, string> = {
            "Content-Type": "application/json"
        }
        // SSE 的eventID 可能为 "0" 或者是 ""
        if (this.lastEventId !== undefined) {
            headers["Last-Event-ID"] = this.lastEventId
        }

        // 通知外部拿到abortController，方便手动取消请求
        callbacks?.onStream?.(this.abortController)

        // 设置请求级超时
        if (this.timeout && this.timeout > 0) {
            this.timeoutTimer = setTimeout(() => {
                this.isTimeout = true
                callbacks?.onError?.(new Error("请求超时"))
                this.abortController?.abort()
            }, this.timeout)
        }

        try {
            const response = await CFetch(this.baseURL, {
                fetch: this.customFetch,
                method: "POST",
                headers,
                body: JSON.stringify({ model: this.model, ...params }),
                signal: this.abortController?.signal
            })

            // 请求已返回，清除请求级超时
            this.clearTimer("timeout")
            // 这里因为可能会存在竞态条件（setTimeout回调和fetch响应同时触发），所以需要判断是否超时
            if (this.isTimeout) return

            // 根据 Content-Type 路由处理
            const contentType = response.headers.get("Content-Type") || ""
            const mediaType = contentType.split(";")[0].trim()
            if (transformStream || mediaType === "text/event-stream") {
                await this.handleStreamResponse<Output>(response, callbacks, transformStream)
            } else if (mediaType === "application/json") {
                await this.handleJsonResponse<Output>(response, callbacks)
            } else {
                throw new Error(`不支持的 Content-Type: ${contentType}`)
            }

            // 请求成功，重置重试状态
            this.resetRetry()
        } catch (error) {
            this.clearTimer("timeout")

            // 如果是流超时或者请求超时触发的，onError 已在定时器中触发，这里无需重复触发，且无需重试请求
            if (this.isStreamTimeout || this.isTimeout) return

            const err = error instanceof Error ? error : new Error("未知错误")

            // AbortError 说明请求被手动取消，无需重复触发
            if (err.name === "AbortError") {
                callbacks?.onError?.(err)
                return
            }

            // 其他错误，通知外部失败回调
            callbacks?.onError?.(err)
            // 否则，重试请求
            this.scheduleRetry(params, callbacks, transformStream)
        }
    }

    /** 流式响应处理 */
    private async handleStreamResponse<Output = SSEOutput>(
        response: Response,
        callbacks?: CRequestCallbacks<Output>,
        transformStream?: TransformStream<string, Output>
    ): Promise<void> {
        const stream: AsyncReadableStream<Output> = SStream<Output>(response.body!, transformStream)
        const chunks: Output[] = []
        const iterator = (stream as any)[Symbol.asyncIterator]()

        let result: IteratorResult<Output>
        do {
            // 每次读取之前设置流超时
            if (this.streamTimeout && this.streamTimeout > 0) {
                this.streamTimeoutTimer = setTimeout(() => {
                    this.isStreamTimeout = true
                    callbacks?.onError?.(new Error("流超时"), response.headers)
                    this.abortController?.abort()
                }, this.streamTimeout)
            }
            result = await iterator.next()
            this.clearTimer("streamTimeout")
            // 这里也可能会存在竞态条件，所以需要判断是否超时
            if (this.isStreamTimeout) break

            if (result.value) {
                chunks.push(result.value)
                callbacks?.onUpdate?.(result.value, response.headers)

                // 记录SSE的eventID，用于断点续传
                const eventId = result.value?.id
                if (eventId !== undefined) {
                    this.lastEventId = eventId
                }
            }
        } while (!result.done)

        // 流式响应结束，通知外部成功回调
        if (!this.isStreamTimeout) {
            callbacks?.onSuccess?.(chunks, response.headers)
        }
    }

    /** JSON 响应处理 */
    private async handleJsonResponse<Output = SSEOutput>(
        response: Response,
        callbacks?: CRequestCallbacks<Output>
    ): Promise<void> {
        const data: Output = await response.json()

        // 业务层错误判断
        const asAny = data as any
        if (asAny?.success === false) {
            const error = new Error(asAny?.message || "系统错误")
            error.name = asAny?.name || "SystemError"
            callbacks?.onError?.(error, response.headers)
            return
        }
        callbacks?.onUpdate?.(data, response.headers)
        // 业务层错误判断通过，通知外部成功回调
        callbacks?.onSuccess?.([data], response.headers)
    }

    /** 按配置延迟后自动重试 */
    private scheduleRetry<Output>(
        params: CRequestParams,
        callbacks?: CRequestCallbacks<Output>,
        transformStream?: TransformStream<string, Output>
    ): void {
        // 重试间隔无效，不重试
        if (!this.retryInterval || this.retryInterval <= 0) return
        // 重试次数超过最大重试次数，不重试
        if (this.retryCount >= this.maxRetries) return
        // 重试次数增加
        this.retryCount++
        // 重试请求
        this.retryTimer = setTimeout(() => {
            this.send(params, callbacks, transformStream)
        }, this.retryInterval)
    }

    private resetRetry() {
        this.clearTimer("retry")
        this.retryCount = 0
        this.lastEventId = undefined
    }

    private clearTimer(type: "timeout" | "streamTimeout" | "retry") {
        const timerMap = {
            timeout: "timeoutTimer",
            streamTimeout: "streamTimeoutTimer",
            retry: "retryTimer"
        } as const
        const key = timerMap[type]
        if (this[key]) {
            clearTimeout(this[key])
            this[key] = null
        }
    }
    private clearALLTimers() {
        this.clearTimer("timeout")
        this.clearTimer("streamTimeout")
        this.clearTimer("retry")
    }
}

const CRequest = CRequestClass.create

export { CRequest, CRequestClass }
