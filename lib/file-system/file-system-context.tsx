"use client"

import type React from "react"
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
} from "react"
import fileSystem from "./file-system"
import type { FileSystemEntity, FileSystemOperationResult, LinkTargetType, Link } from "./types"

interface FileSystemContextType {
  initialized: boolean
  fsVersion: number
  createFile: (name: string, parentId: string, content?: string, mimeType?: string) => Promise<FileSystemOperationResult>
  createDirectory: (name: string, parentId: string) => Promise<FileSystemOperationResult>
  deleteEntity: (entityId: string) => Promise<FileSystemOperationResult>
  renameEntity: (entityId: string, newName: string) => Promise<FileSystemOperationResult>
  getFile: (fileId: string) => Promise<FileSystemEntity | undefined>
  getEntity: (entityId: string) => Promise<FileSystemEntity | undefined>
  getEntityByPath: (path: string) => Promise<FileSystemEntity | null | undefined>
  listDirectory: (dirId: string) => Promise<FileSystemEntity[]>
  updateFileContent: (fileId: string, content: string) => Promise<FileSystemOperationResult>
  getPath: (entityId: string) => Promise<string>
  createLink: (name: string, parentId: string, targetType: LinkTargetType, target: string) => Promise<FileSystemOperationResult<Link>>
  updateLink: (linkId: string, updates: { name?: string; targetType?: LinkTargetType; target?: string }) => Promise<FileSystemOperationResult<Link>>
  updateEntityMetadata: (entityId: string, metadataUpdates: Record<string, any>) => Promise<FileSystemOperationResult>
  listDirectoryByPath: (path: string) => Promise<FileSystemEntity[]>
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined)

export const FileSystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [initialized, setInitialized] = useState(false)
  const [fsVersion, setFsVersion] = useState(0)

  // Function to increment version
  const incrementFsVersion = useCallback(() => {
    setFsVersion(v => v + 1)
    console.log("[FileSystemContext] FS Version Incremented:", fsVersion + 1)
  }, [fsVersion])

  // Initialize file system
  // Note: The initialization effect itself might trigger the first navigateTo
  // but subsequent renders shouldn't cause a loop if navigateTo is stable.

  useEffect(() => {
    const init = async () => {
      await fileSystem.initialize()
      setInitialized(true)
    }
    init()
  }, [])

  // Create a file (Memoized)
  const createFile = useCallback(
    async (name: string, parentId: string, content = "", mimeType = "text/plain") => {
      const result = await fileSystem.createFile(name, parentId, content, mimeType)
      if (result.success) incrementFsVersion()
      return result
    },
    [fileSystem, incrementFsVersion],
  )

  // Create a directory (Memoized)
  const createDirectory = useCallback(
    async (name: string, parentId: string) => {
      const result = await fileSystem.createDirectory(name, parentId)
      if (result.success) incrementFsVersion()
      return result
    },
    [fileSystem, incrementFsVersion],
  )

  // Delete an entity (Memoized)
  const deleteEntity = useCallback(
    async (entityId: string) => {
      const result = await fileSystem.deleteEntity(entityId)
      if (result.success) incrementFsVersion()
      return result
    },
    [fileSystem, incrementFsVersion],
  )

  // Rename an entity (Memoized)
  const renameEntity = useCallback(
    async (entityId: string, newName: string) => {
      const result = await fileSystem.renameEntity(entityId, newName)
      if (result.success) incrementFsVersion()
      return result
    },
    [fileSystem, incrementFsVersion],
  )

  // Get a file by ID (Memoized)
  const getFile = useCallback(
    async (fileId: string) => {
      return fileSystem.getEntity(fileId)
    },
    [fileSystem],
  )

  // Get an entity by ID (Memoized)
  const getEntity = useCallback(
    async (entityId: string) => {
      return fileSystem.getEntity(entityId)
    },
    [fileSystem],
  )

  // Get an entity by path (Memoized)
  const getEntityByPath = useCallback(
    async (path: string) => {
      return fileSystem.getEntityByPath(path)
    },
    [fileSystem],
  )

  // List directory (Memoized)
  const listDirectory = useCallback(
    async (dirId: string) => {
      return fileSystem.listDirectory(dirId)
    },
    [fileSystem],
  )

  // Update file content (Memoized)
  const updateFileContent = useCallback(
    async (fileId: string, content: string) => {
      const result = await fileSystem.updateFileContent(fileId, content)
      if (result.success) incrementFsVersion()
      return result
    },
    [fileSystem, incrementFsVersion],
  )

  // Get file path (Memoized)
  const getPath = useCallback(
    async (entityId: string) => {
      return fileSystem.getPath(entityId)
    },
    [fileSystem],
  )

  // Create a link (Memoized)
  const createLink = useCallback(
    async (name: string, parentId: string, targetType: LinkTargetType, target: string) => {
      const result = await fileSystem.createLink(name, parentId, targetType, target)
      if (result.success) incrementFsVersion()
      return result
    },
    [fileSystem, incrementFsVersion],
  )

  // Update link (Memoized)
  const updateLink = useCallback(
    async (linkId: string, updates: { name?: string; targetType?: LinkTargetType; target?: string }) => {
      const result = await fileSystem.updateLink(linkId, updates)
      if (result.success) incrementFsVersion()
      return result
    },
    [fileSystem, incrementFsVersion],
  )

  // Update entity metadata (Memoized)
  const updateEntityMetadata = useCallback(
    async (entityId: string, metadataUpdates: Record<string, any>) => {
      const result = await fileSystem.updateEntityMetadata(entityId, metadataUpdates)
      return result
    },
    [fileSystem],
  )

  // List directory by path (Memoized)
  const listDirectoryByPath = useCallback(
    async (path: string) => {
      return fileSystem.listDirectoryByPath(path)
    },
    [fileSystem],
  )

  // Context value includes memoized functions
  const contextValue = {
    initialized,
    fsVersion,
    createFile,
    createDirectory,
    deleteEntity,
    renameEntity,
    getFile,
    getEntity,
    getEntityByPath,
    listDirectory,
    updateFileContent,
    getPath,
    createLink,
    updateLink,
    updateEntityMetadata,
    listDirectoryByPath,
  }

  return (
    <FileSystemContext.Provider value={contextValue}>
      {children}
    </FileSystemContext.Provider>
  )
}

export const useFileSystem = () => {
  const context = useContext(FileSystemContext)
  if (context === undefined) {
    throw new Error("useFileSystem must be used within a FileSystemProvider")
  }
  return context
}
