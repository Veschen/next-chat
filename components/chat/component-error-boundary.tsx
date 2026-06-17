"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"

interface ComponentErrorBoundaryProps {
    children: ReactNode
    fallback?: ReactNode
    onError?: (error: Error, info: ErrorInfo) => void
}

interface ComponentErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

export class ComponentErrorBoundary extends Component<
    ComponentErrorBoundaryProps,
    ComponentErrorBoundaryState
> {
    constructor(props: ComponentErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(): ComponentErrorBoundaryState {
        return { hasError: true, error: null }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.props.onError?.(error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }
            return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm font-medium mb-1">组件渲染异常</p>
                    <pre className="text-red-400 text-xs whitespace-pre-wrap overflow-x-auto">
                        {this.props.children}
                    </pre>
                </div>
            )
        }

        return this.props.children
    }
}
