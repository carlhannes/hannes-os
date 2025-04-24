"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useFileSystem } from "@/lib/file-system/file-system-context"
import type { FileSystemEntity } from "@/lib/file-system/types"
import { FolderOpen, FileText, File, ArrowLeft, Home } from "lucide-react"

interface FileSaveDialogProps {
  initialPath: string
  initialFileName: string
  onSave: (path: string, fileName: string) => void
  onCancel: () => void
}

export default function FileSaveDialog({ initialPath, initialFileName, onSave, onCancel }: FileSaveDialogProps) {
  const { navigateTo, navigateUp, currentPath, directoryContents } = useFileSystem()
  const [selectedItem, setSelectedItem] = useState<FileSystemEntity | null>(null)
  const [fileName, setFileName] = useState(initialFileName)
  const [error, setError] = useState<string | null>(null)

  // Navigate to initial path on mount
  useEffect(() => {
    navigateTo(initialPath)
  }, [initialPath, navigateTo])

  // Handle item double click
  const handleItemDoubleClick = (item: FileSystemEntity) => {
    if (item.type === "directory") {
      navigateTo(`${currentPath === "/" ? "" : currentPath}/${item.name}`)
    } else if (item.type === "file") {
      setFileName(item.name)
      setSelectedItem(item)
    }
  }

  // Handle save button click
  const handleSave = () => {
    if (!fileName.trim()) {
      setError("Please enter a file name")
      return
    }

    // Check if file name already exists in current directory
    const fileExists = directoryContents.some(
      (item) => item.type === "file" && item.name.toLowerCase() === fileName.toLowerCase(),
    )

    if (fileExists) {
      // Could show a confirmation dialog here
      setError("A file with this name already exists. Overwrite?")
      return
    }

    onSave(currentPath, fileName)
  }

  // Get icon for an item
  const getItemIcon = (item: FileSystemEntity) => {
    if (item.type === "directory") {
      return <FolderOpen className="w-full h-full text-yellow-500" />
    }

    // Handle different file types based on name/extension
    const name = item.name.toLowerCase()
    if (name.endsWith(".txt")) {
      return <FileText className="w-full h-full text-gray-500" />
    }
    if (name.endsWith(".pdf")) {
      return <FileText className="w-full h-full text-red-500" />
    }

    return <File className="w-full h-full text-gray-500" />
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        className="bg-white rounded-lg shadow-xl w-[500px] max-w-[90vw] overflow-hidden flex flex-col"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        {/* Dialog header */}
        <div className="bg-gradient-to-b from-gray-200 to-gray-100 border-b border-gray-300 p-3 flex items-center">
          <h3 className="text-sm font-medium">Save File</h3>
        </div>

        {/* Navigation bar */}
        <div className="flex items-center px-3 py-2 border-b border-gray-200">
          <button
            className="w-6 h-6 rounded-full bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400 flex items-center justify-center mr-1"
            onClick={() => navigateUp()}
          >
            <ArrowLeft className="w-3 h-3 text-gray-600" />
          </button>
          <button
            className="w-6 h-6 rounded-full bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400 flex items-center justify-center mr-2"
            onClick={() => navigateTo("/")}
          >
            <Home className="w-3 h-3 text-gray-600" />
          </button>
          <div className="text-xs text-gray-600 truncate">{currentPath}</div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-auto p-2 max-h-[300px]">
          <div className="grid grid-cols-4 gap-2">
            {directoryContents.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col items-center p-2 rounded cursor-default ${
                  selectedItem?.id === item.id ? "bg-blue-500/30" : "hover:bg-gray-100"
                }`}
                onClick={() => setSelectedItem(item)}
                onDoubleClick={() => handleItemDoubleClick(item)}
              >
                <div className="w-8 h-8 mb-1 flex items-center justify-center">{getItemIcon(item)}</div>
                <span className="text-xs text-center truncate w-full">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* File name input */}
        <div className="px-3 py-2 border-t border-gray-200">
          <div className="flex items-center">
            <label className="text-xs mr-2">File name:</label>
            <input
              type="text"
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
              value={fileName}
              onChange={(e) => {
                setFileName(e.target.value)
                setError(null)
              }}
            />
          </div>
          {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
        </div>

        {/* Dialog footer */}
        <div className="bg-gray-100 border-t border-gray-300 p-3 flex justify-end space-x-2">
          <button className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded" onClick={onCancel}>
            Cancel
          </button>
          <button className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded" onClick={handleSave}>
            Save
          </button>
        </div>
      </motion.div>
    </div>
  )
}
