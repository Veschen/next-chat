/**
 *  简化版fetch封装
 *  发请求 + 处理响应
 */

export interface FetchOptions extends RequestInit {
    /**
     *  自定义fetch函数 方便测试
     */
    fetch?: typeof fetch
    /**
     *  最大重试次数，默认0次不重试
     */
    maxRetries?: number
    /**
     *  重试间隔，默认1000毫秒
     *  单位：毫秒
     */
    retryInterval?: number
    /**
     * 重试策略，业务可定制
     */
    shouldRetry?: (error: Error, retryCount: number) => boolean
}

export async function CFetch(url: string, options: FetchOptions): Promise<Response> {
    const {
        fetch: fetchFn = globalThis.fetch,
        maxRetries = 0,
        retryInterval = 1000,
        shouldRetry = defaultShouldRetry,
        ...restOptions
    } = options
    let lastError: Error | null = null
    for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
        // 非首次请求，等待重试间隔
        if (retryCount > 0) {
            await new Promise((resolve) => setTimeout(resolve, retryInterval))
        }
        // 发请求
        try {
            const response = await fetchFn(url, restOptions)
            if (!response.ok) {
                const error = new Error(
                    `请求失败 ${response.status} ${response.statusText}`
                ) as Error & { status: number }
                error.status = response.status
                if (
                    response.status >= 500 &&
                    retryCount < maxRetries &&
                    shouldRetry(error, retryCount)
                ) {
                    lastError = error
                    continue
                }
                throw error
            }
            if (!response.body) {
                throw new Error("响应体为空")
            }
            return response
        } catch (error) {
            const err = error instanceof Error ? error : new Error("请求失败")
            // 如果是用户主动取消，则不重试
            if (err.name === "AbortError") {
                throw err
            }
            // 判断是否能重试
            if (retryCount < maxRetries && shouldRetry(err, retryCount)) {
                lastError = err
                continue
            }
            throw err
        }
    }
    throw lastError || new Error("请求失败")
}

/**
 * 默认重试策略
 */
function defaultShouldRetry(error: Error): boolean {
    const status = (error as { status?: number }).status
    if (typeof status === "number" && status >= 500) {
        return true
    }
    if (error.name === "TimeoutError") {
        return true
    }
    return false
}
