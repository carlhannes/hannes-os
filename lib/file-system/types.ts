// File system types

export type FileType = "file" | "directory" | "application" | "link"

export interface FileSystemNode {
  id: string
  name: string
  type: FileType
  parentId: string | null
  createdAt: number
  modifiedAt: number
  metadata: Record<string, any>
}

export interface File extends FileSystemNode {
  type: "file"
  content: string
  mimeType: string
}

export interface Directory extends FileSystemNode {
  type: "directory"
}

export interface Application extends FileSystemNode {
  type: "application"
  appId: string
}

export interface Link extends FileSystemNode {
  type: "link"
  targetType: LinkTargetType
  target: string
}

export type LinkTargetType = "application" | "directory" | "file" | "url"

export type FileSystemEntity = Directory | File | Application | Link

export interface FileSystemState {
  entities: Record<string, FileSystemEntity>
  rootId: string
}

export interface FileSystemOperationResult<T = any> {
  success: boolean
  data?: T
  error?: string
}
