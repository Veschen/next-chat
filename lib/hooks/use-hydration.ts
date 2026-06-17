/**
 * 水合状态检测 Hook
 * 用于解决 SSR 和客户端状态不一致导致的 hydration mismatch 问题
 */
import { useEffect, useState } from "react"

export function useHydration() {
    const [isHydrated, setIsHydrated] = useState(false)

    useEffect(() => {
        setIsHydrated(true)
    }, [])

    return isHydrated
}
