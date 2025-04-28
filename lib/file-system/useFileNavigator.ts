"use client"

import { useState, useEffect, useCallback } from "react"
import { useFileSystem } from "./file-system-context"
import type { FileSystemEntity } from "./types"

interface FileNavigatorOptions {
  initialPath?: string
}

interface FileNavigatorResult {
  currentPath: string
  directoryContents: FileSystemEntity[]
  isLoading: boolean
  error: string | null
  navigateTo: (path: string) => void
  navigateUp: () => void
  refresh: () => void
}

export function useFileNavigator({ initialPath = "/" }: FileNavigatorOptions): FileNavigatorResult {
  const { initialized, getEntityByPath, listDirectory, getPath } = useFileSystem()
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [directoryContents, setDirectoryContents] = useState<FileSystemEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadContents = useCallback(async () => {
    if (!initialized) return
    setIsLoading(true)
    setError(null)
    try {
      const dir = await getEntityByPath(currentPath)
      if (dir && dir.type === "directory") {
        const contents = await listDirectory(dir.id)
        setDirectoryContents(contents)
      } else {
        // Maybe the path resolved to a file, or doesn't exist. Go up? Or error?
        // For now, clear contents and maybe set an error or navigate up.
        setDirectoryContents([])
        if (dir) { // Path exists but is not a directory
            setError(`Path is not a directory: ${currentPath}`)
            // Optionally navigate up:
            // const parentPath = await getPath(dir.parentId);
            // setCurrentPath(parentPath || '/');
        } else { // Path does not exist
            setError(`Path not found: ${currentPath}`)
            // Optionally navigate to root:
            // setCurrentPath('/');
        }
      }
    } catch (err) {
      console.error("Error loading directory contents:", err)
      setError(err instanceof Error ? err.message : "Failed to load directory")
      setDirectoryContents([])
    } finally {
      setIsLoading(false)
    }
  }, [currentPath, initialized, getEntityByPath, listDirectory]) // Removed getPath dependency for now

  useEffect(() => {
    loadContents()
  }, [loadContents]) // Depend on the memoized loadContents function

  const navigateTo = useCallback(
    async (targetPathOrId: string) => {
      setIsLoading(true)
      setError(null)
      // Check if it looks like an ID (UUID format) or a path
      const isLikelyId = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(targetPathOrId);
      let targetPath = targetPathOrId;

      if (isLikelyId) {
          // If it's an ID, try to resolve its path
          targetPath = await getPath(targetPathOrId);
          if (!targetPath) {
              setError("Could not resolve path for ID");
              setIsLoading(false);
              return;
          }
      }

      // Normalize path
      let normalizedPath = targetPath.trim()
      if (normalizedPath !== "/" && normalizedPath.endsWith("/")) {
        normalizedPath = normalizedPath.slice(0, -1)
      }
      if (!normalizedPath.startsWith("/")) {
        normalizedPath = "/" + normalizedPath
      }

      // Check if target is a directory before setting the path
      const targetEntity = await getEntityByPath(normalizedPath);
      if (targetEntity && targetEntity.type === 'directory') {
        setCurrentPath(normalizedPath)
        // loadContents will be triggered by useEffect due to currentPath change
      } else if (targetEntity) {
        setError(`Target is not a directory: ${targetEntity.name}`);
        setIsLoading(false);
      } else {
        setError(`Target path not found: ${normalizedPath}`);
        setIsLoading(false);
      }
    },
    [getEntityByPath, getPath], // Add getPath dependency
  )

  const navigateUp = useCallback(async () => {
    if (currentPath === "/") return
    setIsLoading(true)
    setError(null)
    // Get parent ID from current entity first
    const currentDir = await getEntityByPath(currentPath);
    if (currentDir && currentDir.parentId) {
        const parentPath = await getPath(currentDir.parentId);
        setCurrentPath(parentPath || '/'); // Navigate to parent path or root
    } else {
         // Fallback or if currentDir not found
        const parts = currentPath.split("/").filter(Boolean)
        parts.pop()
        const parentPath = parts.length === 0 ? "/" : `/${parts.join("/")}`
        setCurrentPath(parentPath);
    }
    // loadContents will be triggered by useEffect
  }, [currentPath, getEntityByPath, getPath])

  const refresh = useCallback(() => {
      loadContents();
  }, [loadContents]);

  return { currentPath, directoryContents, isLoading, error, navigateTo, navigateUp, refresh }
} 