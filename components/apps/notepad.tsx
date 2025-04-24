"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useFileSystem } from "@/lib/file-system/file-system-context"
import type { File } from "@/lib/file-system/types"
import DropdownMenu, { type MenuItem } from "@/components/dropdown-menu"
import { useDialog } from "@/components/dialogs/dialog-context"

interface NotepadProps {
  initialContent?: string
  fileId?: string
}

export default function Notepad({ initialContent = "", fileId }: NotepadProps) {
  const [content, setContent] = useState(initialContent)
  const [fileName, setFileName] = useState("Untitled.txt")
  const [isModified, setIsModified] = useState(false)
  const [isLoading, setIsLoading] = useState(!!fileId)
  const [currentFileId, setCurrentFileId] = useState<string | undefined>(fileId)
  const { getFile, updateFileContent, createFile, getPath } = useFileSystem()
  const { showFileOpenDialog, showFileSaveDialog } = useDialog()

  // Load file content if fileId is provided
  useEffect(() => {
    const loadFile = async () => {
      if (fileId) {
        const file = await getFile(fileId)
        if (file && file.type === "file") {
          setContent((file as File).content)
          setFileName(file.name)
          setCurrentFileId(fileId)
          setIsModified(false)
        }
        setIsLoading(false)
      }
    }

    if (fileId) {
      loadFile()
    }
  }, [fileId, getFile])

  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    setIsModified(true)
  }

  // Create new document
  const handleNew = () => {
    if (isModified) {
      // Could show a confirmation dialog here
      if (!window.confirm("You have unsaved changes. Continue without saving?")) {
        return
      }
    }
    setContent("")
    setFileName("Untitled.txt")
    setCurrentFileId(undefined)
    setIsModified(true)
  }

  // Open file
  const handleOpen = () => {
    if (isModified) {
      // Could show a confirmation dialog here
      if (!window.confirm("You have unsaved changes. Continue without saving?")) {
        return
      }
    }

    showFileOpenDialog(async (fileId) => {
      const file = await getFile(fileId)
      if (file && file.type === "file") {
        setContent((file as File).content)
        setFileName(file.name)
        setCurrentFileId(fileId)
        setIsModified(false)
      }
    }, "/Users/User/Documents")
  }

  // Save file
  const handleSave = async () => {
    if (currentFileId) {
      // Update existing file
      await updateFileContent(currentFileId, content)
      setIsModified(false)
    } else {
      // No file ID, do Save As instead
      handleSaveAs()
    }
  }

  // Save As
  const handleSaveAs = () => {
    showFileSaveDialog(
      async (path, newFileName) => {
        // Create a new file
        const result = await createFile(newFileName, content)
        if (result.success && result.data) {
          setFileName(result.data.name)
          setCurrentFileId(result.data.id)
          setIsModified(false)
        }
      },
      fileName,
      "/Users/User/Documents",
    )
  }

  // File menu items
  const fileMenuItems: MenuItem[] = [
    { label: "New", action: handleNew, shortcut: "⌘N" },
    { label: "Open...", action: handleOpen, shortcut: "⌘O" },
    { separator: true },
    { label: "Save", action: handleSave, shortcut: "⌘S" },
    { label: "Save As...", action: handleSaveAs, shortcut: "⇧⌘S" },
    { separator: true },
    { label: "Close", action: () => console.log("Close") },
  ]

  // Edit menu items
  const editMenuItems: MenuItem[] = [
    { label: "Undo", shortcut: "⌘Z", disabled: true },
    { label: "Redo", shortcut: "⇧⌘Z", disabled: true },
    { separator: true },
    { label: "Cut", shortcut: "⌘X" },
    { label: "Copy", shortcut: "⌘C" },
    { label: "Paste", shortcut: "⌘V" },
    { separator: true },
    { label: "Select All", shortcut: "⌘A" },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Menu bar */}
      <div className="h-8 bg-gradient-to-b from-gray-200 to-gray-100 border-b border-gray-300 flex items-center px-2 space-x-1">
        <DropdownMenu label="File" items={fileMenuItems} />
        <DropdownMenu label="Edit" items={editMenuItems} />
      </div>

      {/* Status bar - shows file name and modified status */}
      <div className="h-6 bg-gray-100 border-b border-gray-300 flex items-center px-2 text-xs text-gray-600">
        {fileName} {isModified && "• Modified"}
      </div>

      {/* Editor */}
      <textarea
        className="flex-1 p-2 resize-none focus:outline-none font-mono text-sm text-gray-900"
        value={content}
        onChange={handleContentChange}
        placeholder="Type something..."
      />

      {/* Status bar */}
      <div className="h-5 bg-gray-100 border-t border-gray-300 flex items-center px-2 text-xs text-gray-600">
        {content.length} characters
      </div>
    </div>
  )
}
