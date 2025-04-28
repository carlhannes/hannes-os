"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useFileNavigator } from "@/lib/file-system/useFileNavigator"
import type { FileSystemEntity } from "@/lib/file-system/types"
import { FolderOpen, FileText, File, ArrowLeft, Home } from "lucide-react"

interface FileOpenDialogProps {
  initialPath?: string
  onSelect: (entityId: string) => void
  onCancel: () => void
  filter?: (entity: FileSystemEntity) => boolean
}

export default function FileOpenDialog({ initialPath = "/", onSelect, onCancel, filter }: FileOpenDialogProps) {
  const { currentPath, directoryContents, navigateTo, navigateUp, isLoading, error } = useFileNavigator({ initialPath });
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)

  const filteredContents = filter ? directoryContents.filter(filter) : directoryContents;

  const handleItemClick = (item: FileSystemEntity) => {
    setSelectedEntityId(item.id);
  };

  const handleItemDoubleClick = (item: FileSystemEntity) => {
    if (item.type === "directory") {
      navigateTo(item.id);
    } else {
      if (!filter || filter(item)) {
        setSelectedEntityId(item.id);
        handleSelect(item.id);
      } else {
        console.log("Item double-clicked but does not match filter:", item.name);
      }
    }
  };

  const handleSelect = (idToSelect: string | null = selectedEntityId) => {
    if (idToSelect) {
      onSelect(idToSelect);
    }
  };

  const getIcon = (item: FileSystemEntity) => {
    if (item.type === 'directory') return <FolderOpen className="w-4 h-4 mr-2 text-yellow-500" />;
    if (item.type === 'link') {
        return <File className="w-4 h-4 mr-2 text-blue-400" />;
    }
    return <FileText className="w-4 h-4 mr-2 text-gray-500" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <motion.div 
        className="bg-white rounded-lg shadow-xl p-4 w-[500px] h-[400px] flex flex-col"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <h2 className="text-lg font-semibold mb-3">Select Item</h2>

        <div className="flex items-center mb-2 space-x-1">
          <button 
            onClick={navigateUp} 
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
            disabled={currentPath === '/'}
          >
              <ArrowLeft size={16} />
          </button>
          <button 
            onClick={() => navigateTo("/")} 
            className="p-1 rounded hover:bg-gray-200"
          >
              <Home size={16} />
          </button>
          <div className="flex-1 h-6 bg-gray-100 rounded border border-gray-300 px-2 text-sm flex items-center truncate">
            {currentPath}
          </div>
        </div>

        <div className="flex-1 border border-gray-300 rounded overflow-y-auto mb-3 bg-white">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">Error: {error}</div>
          ) : (
            filteredContents.map((item: FileSystemEntity) => (
              <div
                key={item.id}
                className={`flex items-center p-1.5 cursor-default ${
                  selectedEntityId === item.id ? "bg-blue-500 text-white" : "hover:bg-gray-100"
                } ${
                  filter && !filter(item) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => { if (!filter || filter(item)) handleItemClick(item); }}
                onDoubleClick={() => handleItemDoubleClick(item)}
              >
                {getIcon(item)}
                <span className="text-sm truncate">{item.name}</span>
              </div>
            ))
          )}
          {!isLoading && !error && filteredContents.length === 0 && (
            <div className="p-4 text-center text-gray-500">Folder is empty or contains no matching items</div>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSelect()}
            disabled={!selectedEntityId}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            Select
          </button>
        </div>
      </motion.div>
    </div>
  );
}
