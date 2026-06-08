'use client'

import React, { useCallback, useRef, useState } from 'react'
import { Upload, X, FileText, FileImage, FileAudio, FileVideo, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import type { UploadingFile } from '@/lib/store/types'

interface FileCardProps {
    file: UploadingFile
    onRemove: (uid: string) => void
}

/** 文件卡片组件 */
function FileCard({ file, onRemove }: FileCardProps) {
    const [showRemove, setShowRemove] = useState(false)

    const getFileIcon = () => {
        const iconClass = 'w-5 h-5'
        if (!file.mimeType) return <File className={iconClass} />
        
        if (file.mimeType.startsWith('image/')) {
            return <FileImage className={iconClass} />
        }
        if (file.mimeType.startsWith('audio/')) {
            return <FileAudio className={iconClass} />
        }
        if (file.mimeType.startsWith('video/')) {
            return <FileVideo className={iconClass} />
        }
        return <FileText className={iconClass} />
    }

    const formatFileSize = (size?: number) => {
        if (!size) return '-'
        if (size < 1024) return `${size} B`
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
        return `${(size / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <div
            className={cn(
                'relative flex items-center gap-3 rounded-lg border p-2.5 bg-background',
                'hover:bg-muted/50 transition-colors'
            )}
            onMouseEnter={() => setShowRemove(true)}
            onMouseLeave={() => setShowRemove(false)}
        >
            {/* 删除按钮 */}
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    'absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground',
                    'transition-opacity',
                    showRemove ? 'opacity-100' : 'opacity-0'
                )}
                onClick={() => onRemove(file.uid)}
            >
                <X className="w-3 h-3" />
            </Button>

            {/* 文件预览或图标 */}
            <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                {file.previewUrl ? (
                    <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        {getFileIcon()}
                    </div>
                )}
            </div>

            {/* 文件信息 */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>

            {/* 进度条 */}
            {file.status === 'uploading' && (
                <div className="w-20">
                    <Progress value={file.progress || 0} className="h-1" />
                </div>
            )}

            {/* 状态图标 */}
            {file.status === 'done' && (
                <div className="text-green-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
            {file.status === 'failed' && (
                <div className="text-red-500 text-xs">{file.errorMessage || '上传失败'}</div>
            )}
        </div>
    )
}

interface AttachmentsProps {
    files: UploadingFile[]
    onAddFiles: (files: File[]) => void
    onRemoveFile: (uid: string) => void
    accept?: string
    maxCount?: number
    disabled?: boolean
}

/** 附件上传主组件 */
export function Attachments({
    files,
    onAddFiles,
    onRemoveFile,
    accept,
    maxCount = 10,
    disabled = false,
}: AttachmentsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        if (disabled) return
        if (files.length >= maxCount) return

        const droppedFiles = Array.from(e.dataTransfer.files).filter(file => {
            if (!accept) return true
            return file.type.match(new RegExp(accept.replace(/,/g, '|').replace(/\*/g, '.*')))
        })

        if (droppedFiles.length > 0) {
            onAddFiles(droppedFiles)
        }
    }, [accept, disabled, files.length, maxCount, onAddFiles])

    const handleClick = useCallback(() => {
        if (disabled || files.length >= maxCount) return
        fileInputRef.current?.click()
    }, [disabled, files.length, maxCount])

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || [])
        if (selectedFiles.length > 0) {
            onAddFiles(selectedFiles)
        }
        e.target.value = '' // 重置input以便重复选择相同文件
    }, [onAddFiles])

    // 无文件时显示拖拽区域
    if (files.length === 0) {
        return (
            <div
                className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                    'hover:border-primary hover:bg-primary/5',
                    isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/30',
                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <Upload className={cn('w-10 h-10 mx-auto mb-3', isDragging ? 'text-primary' : 'text-muted-foreground')} />
                <p className="text-sm font-medium text-foreground mb-1">
                    {isDragging ? '松开以上传文件' : '拖拽文件到此处上传'}
                </p>
                <p className="text-xs text-muted-foreground">
                    或点击选择文件，支持 {accept || '所有文件类型'}
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={accept}
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={disabled}
                />
            </div>
        )
    }

    // 有文件时显示文件列表 + 继续上传按钮
    return (
        <div className="space-y-3">
            {/* 文件列表 */}
            <div className="space-y-2">
                {files.map(file => (
                    <FileCard key={file.uid} file={file} onRemove={onRemoveFile} />
                ))}
            </div>

            {/* 继续上传按钮 */}
            {files.length < maxCount && !disabled && (
                <div
                    className={cn(
                        'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all',
                        'hover:border-primary hover:bg-primary/5 border-muted-foreground/30'
                    )}
                    onClick={handleClick}
                >
                    <Upload className="w-5 h-5 inline-block mr-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">继续添加文件</span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={accept}
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            )}
        </div>
    )
}
