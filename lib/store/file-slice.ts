/** 
 * 文件管理 slice
 * 包含待上传文件列表、是否正在上传文件、添加文件、删除文件、清空文件、获取已上传文件列表
 */
import { generateId } from "./utils"
import type { StateCreator } from "zustand"
import type { FileSlice, ChatStore, UploadingFile, FileItem } from "./types"

function isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/')
}

function createPreviewUrl(file: File): string | undefined {
    if (isImageFile(file.type)) {
        return URL.createObjectURL(file)
    }
    return undefined
}

export const createFileSlice: StateCreator<
    ChatStore,
    [['zustand/immer', never], ['zustand/devtools', never]],
    [],
    FileSlice
> = (set, get) => ({
    pendingFiles: [],
    isUploading: false,

    addFiles: (files: File[]) => {
        const uploadingFiles: UploadingFile[] = files.map(file => ({
            uid: generateId(),
            name: file.name,
            size: file.size,
            mimeType: file.type,
            status: 'done' as const,
            progress: 100,
            previewUrl: createPreviewUrl(file),
            file,
        }))

        set((state) => {
            state.pendingFiles.push(...uploadingFiles)
        }, false, 'file/add')
    },

    removeFile: (uid: string) => {
        set((state) => {
            const index = state.pendingFiles.findIndex(f => f.uid === uid)
            if (index !== -1) {
                const file = state.pendingFiles[index]
                // 释放预览图片URL
                if (file.previewUrl) {
                    URL.revokeObjectURL(file.previewUrl)
                }
                state.pendingFiles.splice(index, 1)
            }
        }, false, 'file/remove')
    },

    clearFiles: () => {
        set((state) => {
             // 释放非图片文件的预览url
            for (const file of state.pendingFiles) {
                if (file.previewUrl && !file.mimeType?.startsWith('image/')) {
                    URL.revokeObjectURL(file.previewUrl)
                }
            }
            state.pendingFiles = []
            state.isUploading = false
        }, false, 'file/clear')
    },

    getReadyFiles: (): FileItem[] => {
        const { pendingFiles } = get()
        return pendingFiles
            .filter(f => f.status === 'done')
            .map(f => ({
                uid: f.uid,
                name: f.name,
                url: f.previewUrl,
                size: f.size,
                mimeType: f.mimeType,
            }))
    },
})
