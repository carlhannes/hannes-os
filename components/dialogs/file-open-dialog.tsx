"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useFileSystem } from "@/lib/file-system/file-system-context"
import type { FileSystemEntity } from "@/lib/file-system/types"
import { FolderOpen, FileText, File, ArrowLeft, Home } from "lucide-react"

interface FileOpenDialogProps {
  initialPath?: string
  onSelect: (entityId: string) => void
  onCancel: () => void
  filter?: (entity: FileSystemEntity) => boolean
}

export default function FileOpenDialog({ initialPath = "/", onSelect, onCancel, filter }: FileOpenDialogProps) {
  const { initialized, getEntityByPath, listDirectory } = useFileSystem()
  const [currentDialogPath, setCurrentDialogPath] = useState(initialPath)
  const [dialogContents, setDialogContents] = useState<FileSystemEntity[]>([])
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadContents = async () => {
      if (!initialized) return;
      setIsLoading(true);
      try {
        const dir = await getEntityByPath(currentDialogPath);
        if (dir && dir.type === "directory") {
          const contents = await listDirectory(dir.id);
          const filteredContents = filter ? contents.filter(filter) : contents;
          setDialogContents(filteredContents);
          setSelectedEntityId(null);
        } else {
          setDialogContents([]);
          setSelectedEntityId(null);
        }
      } catch (error) {
        console.error("Error loading dialog contents:", error);
        setDialogContents([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadContents();
  }, [currentDialogPath, initialized, getEntityByPath, listDirectory, filter]);

  const navigateDialogTo = (path: string) => {
    let targetPath = path.trim();
    if (targetPath !== "/" && targetPath.endsWith("/")) {
      targetPath = targetPath.slice(0, -1);
    }
    if (!targetPath.startsWith("/")) {
      targetPath = "/" + targetPath;
    }
    setCurrentDialogPath(targetPath);
  };

  const navigateDialogUp = () => {
    if (currentDialogPath === "/") return;
    const parts = currentDialogPath.split("/").filter(Boolean);
    parts.pop();
    const parentPath = parts.length === 0 ? "/" : `/${parts.join("/")}`;
    navigateDialogTo(parentPath);
  };

  const handleItemClick = (item: FileSystemEntity) => {
    setSelectedEntityId(item.id);
  };

  const handleItemDoubleClick = (item: FileSystemEntity) => {
    if (item.type === "directory") {
      const targetPath = `${currentDialogPath === "/" ? "" : currentDialogPath}/${item.name}`;
      navigateDialogTo(targetPath);
    } else {
      setSelectedEntityId(item.id);
      handleSelect();
    }
  };

  const handleSelect = () => {
    if (selectedEntityId) {
      onSelect(selectedEntityId);
    }
  };

  const getIcon = (item: FileSystemEntity) => {
    if (item.type === 'directory') return <FolderOpen className="w-4 h-4 mr-2 text-yellow-500" />;
    return <FileText className="w-4 h-4 mr-2 text-gray-500" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl p-4 w-[500px] h-[400px] flex flex-col">
        <h2 className="text-lg font-semibold mb-3">Select Item</h2>

        <div className="flex items-center mb-2 space-x-1">
          <button onClick={navigateDialogUp} className="p-1 rounded hover:bg-gray-200"><ArrowLeft size={16} /></button>
          <button onClick={() => navigateDialogTo("/")} className="p-1 rounded hover:bg-gray-200"><Home size={16} /></button>
          <div className="flex-1 h-6 bg-gray-100 rounded border border-gray-300 px-2 text-sm flex items-center truncate">
            {currentDialogPath}
          </div>
        </div>

        <div className="flex-1 border border-gray-300 rounded overflow-y-auto mb-3 bg-white">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : (
            dialogContents.map((item) => (
              <div
                key={item.id}
                className={`flex items-center p-1.5 cursor-default ${
                  selectedEntityId === item.id ? "bg-blue-500 text-white" : "hover:bg-gray-100"
                }`}
                onClick={() => handleItemClick(item)}
                onDoubleClick={() => handleItemDoubleClick(item)}
              >
                {getIcon(item)}
                <span className="text-sm truncate">{item.name}</span>
              </div>
            ))
          )}
          {!isLoading && dialogContents.length === 0 && (
            <div className="p-4 text-center text-gray-500">Folder is empty</div>
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
            onClick={handleSelect}
            disabled={!selectedEntityId}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}
