"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { ArrowLeft, Home, FolderOpen, FileText, File, Database, FileSpreadsheet, Plus, RefreshCw, Link as LinkIcon, Globe, Download, HardDrive } from "lucide-react"
import { useContextMenu, type MenuItem } from "@/components/context-menu-provider"
import { useFileSystem } from "@/lib/file-system/file-system-context"
import type { FileSystemEntity, Link, LinkTargetType } from "@/lib/file-system/types"
import { useWindow } from "@/components/window-context"
import { useApp } from "@/components/app-context"
import { useDialog } from "@/components/dialogs/dialog-context"

interface FileManagerProps {
  initialPath?: string
}

export default function FileManager({ initialPath = "/" }: FileManagerProps) {
  // Core FS functions from context (stateless operations)
  const {
    initialized,
    getEntityByPath,
    listDirectory,
    createFile: fsCreateFile,
    createDirectory: fsCreateDirectory,
    deleteEntity: fsDeleteEntity,
    renameEntity: fsRenameEntity,
    getPath,
    getFile,
    createLink,
    updateLink,
    fsVersion,
  } = useFileSystem();

  const { openWindow } = useWindow();
  const { showContextMenu } = useContextMenu();
  const { apps, getAppById } = useApp();
  const { showCreateLinkDialog, showEditLinkDialog, showErrorDialog } = useDialog();

  // Local state for this FileManager instance's view
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [currentDirectory, setCurrentDirectory] = useState<FileSystemEntity | null>(null);
  const [directoryContents, setDirectoryContents] = useState<FileSystemEntity[]>([]);
  const [selectedItem, setSelectedItem] = useState<FileSystemEntity | null>(null);
  const [viewMode, setViewMode] = useState<"icon" | "list">("icon");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<"file" | "directory">("file");
  const [isLoading, setIsLoading] = useState(true);
  const [editablePath, setEditablePath] = useState(currentPath);

  // State for inline renaming
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [renamingItemName, setRenamingItemName] = useState<string>("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingItemId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingItemId]);

  // --- Local Navigation and View Logic --- 

  const navigateTo = useCallback(async (path: string) => {
    setIsLoading(true);
    console.log(`[FileManager-${id}] navigateTo called with path: ${path}`);
    try {
      const dir = await getEntityByPath(path);
      console.log(`[FileManager-${id}] getEntityByPath returned:`, dir);
      if (dir && dir.type === "directory") {
        setCurrentPath(path);
        setCurrentDirectory(dir);
        const contents = await listDirectory(dir.id);
        setDirectoryContents(contents);
        setEditablePath(path);
        console.log(`[FileManager-${id}] State updated. New path: ${path}, New contents:`, contents);
      } else {
        console.error(`[FileManager-${id}] Navigation failed: Entity not found or not a directory at path: ${path}`);
        setEditablePath(currentPath);
      }
    } catch (error) {
      console.error(`[FileManager-${id}] Error during navigation to ${path}:`, error);
      setEditablePath(currentPath);
    }
    setIsLoading(false);
  }, [getEntityByPath, listDirectory, currentPath, id]);

  const navigateUp = useCallback(async () => {
    if (currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const parentPath = parts.length === 0 ? "/" : `/${parts.join("/")}`;
    await navigateTo(parentPath);
  }, [currentPath, navigateTo]);

  const refreshView = useCallback(async () => {
    console.log(`[FileManager-${id}] Refreshing view for path: ${currentPath}`);
    await navigateTo(currentPath);
  }, [currentPath, navigateTo, id]);

  const refreshCurrentDirectory = useCallback(async () => {
    console.log(`[FileManager-${id}] Refreshing directory for path: ${currentPath}`);
    try {
      if (currentPath) {
        const dir = await getEntityByPath(currentPath);
        if (dir && dir.type === "directory") {
          setCurrentDirectory(dir);
          const contents = await listDirectory(dir.id);
          setDirectoryContents(contents);
          setEditablePath(currentPath);
          console.log(`[FileManager-${id}] State updated. New path: ${currentPath}, New contents:`, contents);
        } else {
          console.error(`[FileManager-${id}] Navigation failed: Entity not found or not a directory at path: ${currentPath}`);
          setEditablePath(currentPath);
        }
      }
    } catch (error) {
      console.error(`[FileManager-${id}] Error during refreshCurrentDirectory:`, error);
      setEditablePath(currentPath);
    } finally {
      setIsLoading(false);
    }
  }, [initialized, currentPath, getEntityByPath, listDirectory, fsVersion]);

  // Update editablePath when actual currentPath changes
  useEffect(() => {
    setEditablePath(currentPath);
  }, [currentPath]);

  // Navigate to initial path on mount
  useEffect(() => {
    if (initialized) {
      navigateTo(initialPath).catch(console.error);
    } else {
      setIsLoading(true);
    }
  }, [initialized, initialPath]);

  useEffect(() => {
    if (initialized && currentPath) {
      refreshCurrentDirectory()
    }
  }, [initialized, currentPath, fsVersion])

  // --- Event Handlers ---

  const handleItemClick = (item: FileSystemEntity) => {
    if (renamingItemId === item.id) return;
    setSelectedItem(item);
  };

  const handleItemDoubleClick = async (item: FileSystemEntity) => {
    if (renamingItemId === item.id) return;
    if (item.type === "directory") {
      const targetPath = `${currentPath === "/" ? "" : currentPath}/${item.name}`;
      navigateTo(targetPath);
    } else if (item.type === "file") {
      console.log(`[FileManager] Opening file: ${item.name} (ID: ${item.id})`);
      openWindow({
        title: "TextEdit",
        subtitle: item.name,
        icon: "Notepad",
        component: "Notepad",
        position: {
          x: Math.max(50, Math.random() * 100),
          y: Math.max(50, Math.random() * 100),
          width: 500,
          height: 400,
        },
        props: { fileId: item.id },
      });
    } else if (item.type === "link") {
      const link = item as Link;
      switch (link.targetType) {
        case "application":
          const appInfo = getAppById(link.target);
          if (appInfo) {
            console.log(`[FileManager] Opening application via link: ${appInfo.name}`);
            openWindow({
              title: appInfo.name,
              icon: appInfo.id,
              component: appInfo.component,
              position: { ...appInfo.defaultSize, x: 50, y: 50 },
              props: {},
            });
          } else {
            console.error(`[FileManager] App not found for link target: ${link.target}`);
          }
          break;
        case "directory":
          const targetPath = await getPath(link.target);
          if (targetPath) {
            console.log(`[FileManager] Navigating to directory via link: ${targetPath}`);
            navigateTo(targetPath);
          } else {
            console.error(`[FileManager] Could not resolve path for directory link target: ${link.target}`);
          }
          break;
        case "file":
          console.log(`[FileManager] Opening file via link, target ID: ${link.target}`);
          openWindow({
            title: "TextEdit",
            subtitle: link.name.replace(".lnk", ""),
            icon: "Notepad",
            component: "Notepad",
            position: {
              x: Math.max(50, Math.random() * 100),
              y: Math.max(50, Math.random() * 100),
              width: 500,
              height: 400,
            },
            props: { fileId: link.target },
          });
          break;
        case "url":
          console.log(`[FileManager] Opening URL via link: ${link.target}`);
          openWindow({
            title: "Browser",
            subtitle: link.target,
            icon: "Browser",
            component: "Browser",
            position: {
              x: Math.max(50, Math.random() * 100),
              y: Math.max(50, Math.random() * 100),
              width: 800,
              height: 600,
            },
            props: { initialUrl: link.target },
          });
          break;
        default:
          console.warn(`[FileManager] Unknown link target type: ${link.targetType}`);
      }
    } else if (item.type === "application") {
      console.log("Opening application (legacy type):", item.name);
    }
  };

  // --- Rename Handlers ---
  const handleStartRename = useCallback((item: FileSystemEntity) => {
    setIsCreatingNew(false);
    setNewItemName("");
    setRenamingItemId(item.id);
    setRenamingItemName(item.name);
    setSelectedItem(item);
  }, []);

  const handleCancelRename = useCallback(() => {
    setRenamingItemId(null);
    setRenamingItemName("");
  }, []);

  const handleConfirmRename = useCallback(async () => {
    if (!renamingItemId || !renamingItemName.trim()) {
      handleCancelRename();
      return;
    }

    const originalItem = directoryContents.find(item => item.id === renamingItemId);
    if (!originalItem || originalItem.name === renamingItemName.trim()) {
      handleCancelRename();
      return;
    }

    console.log(`[FileManager] Renaming item ${renamingItemId} to "${renamingItemName.trim()}"`);
    const result = await fsRenameEntity(renamingItemId, renamingItemName.trim());
    if (result.success) {
      refreshView();
    } else {
      console.error("Failed to rename item:", result.error);
      showErrorDialog(result.error || "Failed to rename item.");
    }
    handleCancelRename();
  }, [renamingItemId, renamingItemName, fsRenameEntity, refreshView, showErrorDialog, handleCancelRename, directoryContents]);

  const handleRenameInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelRename();
    }
  };

  const handleCreateLink = (targetType: LinkTargetType) => {
    if (!currentDirectory) return;
    const parentId = currentDirectory.id;

    showCreateLinkDialog(targetType, async (name, target) => {
      console.log(`Creating ${targetType} link named "${name}" pointing to "${target}" in ${parentId}`);
      const result = await createLink(name, parentId, targetType, target);
      if (result.success) {
        refreshView();
      } else {
        console.error("Failed to create link:", result.error);
        showErrorDialog(result.error || "Failed to create link.");
      }
    });
  };

  const handleContextMenu = (e: React.MouseEvent, item?: FileSystemEntity) => {
    e.preventDefault();
    e.stopPropagation();
    if (item && renamingItemId !== item.id) {
        setSelectedItem(item);
    }
    if (!item) {
        handleCancelRename();
        setIsCreatingNew(false);
    }

    const menuItems: MenuItem[] = [
      ...(item
        ? [
            { label: "Open", action: () => item && handleItemDoubleClick(item) },
            { label: "Rename", action: () => item && handleStartRename(item) },
            { separator: true as const },
            ...(item.type === 'link' ? [
               { label: "Edit Link...", action: () => handleEditLink(item as Link) },
               { separator: true as const },
            ] : []),
            { label: "Delete", action: () => { fsDeleteEntity(item!.id).then(refreshView); } },
          ]
        : []),
      ...(!item ? [{ separator: true as const }] : []),
      {
        label: "New File",
        action: () => {
          handleCancelRename();
          setNewItemType("file")
          setNewItemName("Untitled.txt")
          setIsCreatingNew(true)
        },
      },
      {
        label: "New Folder",
        action: () => {
          handleCancelRename();
          setNewItemType("directory")
          setNewItemName("Untitled Folder")
          setIsCreatingNew(true)
        },
      },
      { separator: true as const },
      {
        label: "New Link...",
        submenu: [
          { label: "Application Link...", action: () => handleCreateLink('application') },
          { label: "Folder Link...", action: () => handleCreateLink('directory') },
          { label: "File Link...", action: () => handleCreateLink('file') },
          { label: "URL Link...", action: () => handleCreateLink('url') },
        ],
      },
      { separator: true as const },
      { label: "Refresh", action: refreshView },
    ]

    const finalMenuItems = menuItems.filter((menuItem, index, arr) => {
        if (menuItem.separator) {
            if (index === 0 || index === arr.length - 1) return false;
            if (arr[index - 1]?.separator) return false;
        }
        return true;
    });

    showContextMenu(e, finalMenuItems);
  };

  const handleCreateNewItem = async () => {
    if (!newItemName || !currentDirectory) return

    const parentId = currentDirectory.id

    let result
    if (newItemType === "file") {
      result = await fsCreateFile(newItemName, parentId)
    } else {
      result = await fsCreateDirectory(newItemName, parentId)
    }

    if (result.success) {
      refreshView()
    } else {
      console.error("Failed to create item:", result.error)
      showErrorDialog(result.error || "Failed to create item.")
    }
    setIsCreatingNew(false)
    setNewItemName("")
  };

  const getItemIcon = (item: FileSystemEntity) => {
    let baseIcon: React.ReactNode = null;

    if (item.type === "link") {
      const link = item as Link;
      switch (link.targetType) {
        case "application":
          const appInfo = getAppById(link.target);
          baseIcon = appInfo ? appInfo.icon : <Database className="w-full h-full text-gray-500" />;
          break;
        case "directory":
          baseIcon = <FolderOpen className="w-full h-full text-yellow-500" />;
          break;
        case "file":
          baseIcon = <FileText className="w-full h-full text-gray-500" />;
          break;
        case "url":
          baseIcon = <Globe className="w-full h-full text-purple-500" />;
          break;
        default:
          baseIcon = <File className="w-full h-full text-gray-500" />;
      }
      return (
        <div className="relative w-full h-full">
          {baseIcon}
          <LinkIcon className="absolute bottom-0 right-0 w-4 h-4 bg-white rounded-full p-0.5 text-blue-600 shadow" />
        </div>
      );
    }

    if (item.type === "application") {
      const appInfo = getAppById(item.appId);
      return appInfo ? appInfo.icon : <Database className="w-full h-full text-gray-500" />;
    }
    if (item.type === "directory") {
      return <FolderOpen className="w-full h-full text-yellow-500" />;
    }
    const name = item.name.toLowerCase();
    if (name.endsWith(".txt")) {
      return <FileText className="w-full h-full text-gray-500" />;
    }
    if (name.endsWith(".pdf")) {
      return <FileText className="w-full h-full text-red-500" />
    }
    if (name.endsWith(".xlsx") || name.endsWith(".csv")) {
      return <FileSpreadsheet className="w-full h-full text-green-500" />
    }

    return <File className="w-full h-full text-gray-500" />
  };

  const handlePathInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditablePath(e.target.value)
  };

  const handlePathInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      let targetPath = editablePath.trim()
      if (targetPath !== "/" && targetPath.endsWith("/")) {
        targetPath = targetPath.slice(0, -1)
      }
      if (!targetPath.startsWith("/")) {
        targetPath = "/" + targetPath
      }
      navigateTo(targetPath)
      e.currentTarget.blur()
    } else if (e.key === "Escape") {
      setEditablePath(currentPath)
      e.currentTarget.blur()
    }
  };

  const handleEditLink = (link: Link) => {
    console.log("Editing link:", link);
    showEditLinkDialog(link, async (linkId, updates) => {
        console.log(`Updating link ${linkId} with:`, updates);
        const result = await updateLink(linkId, updates);
        if (result.success) {
            refreshView();
        } else {
            console.error("Failed to update link:", result.error);
            showErrorDialog(result.error || "Failed to update link.");
        }
    });
  }

  // --- Render Logic ---

  if (!initialized || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-10 bg-gradient-to-b from-gray-200 to-gray-100 border-b border-gray-300 flex items-center px-2 space-x-2">
        <button
          className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400 flex items-center justify-center"
          onClick={navigateUp}
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <button
          className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400 flex items-center justify-center"
          onClick={() => navigateTo("/Users/User")}
        >
          <Home className="w-4 h-4 text-gray-600" />
        </button>
        <button
          className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400 flex items-center justify-center"
          onClick={refreshView}
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>

        <input
          type="text"
          className="flex-1 h-6 bg-white rounded border border-gray-400 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={editablePath}
          onChange={handlePathInputChange}
          onKeyDown={handlePathInputKeyDown}
          onBlur={() => setEditablePath(currentPath)}
          spellCheck="false"
        />

        <button
          className={`w-8 h-8 rounded-full ${viewMode === "icon" ? "bg-blue-500" : "bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400"} flex items-center justify-center`}
          onClick={() => setViewMode("icon")}
        >
          <svg className={`w-4 h-4 ${viewMode === "icon" ? "text-white" : "text-gray-600"}`} viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>
        <button
          className={`w-8 h-8 rounded-full ${viewMode === "list" ? "bg-blue-500" : "bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400"} flex items-center justify-center`}
          onClick={() => setViewMode("list")}
        >
          <svg className={`w-4 h-4 ${viewMode === "list" ? "text-white" : "text-gray-600"}`} viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="4" rx="1" />
            <rect x="3" y="10" width="18" height="4" rx="1" />
            <rect x="3" y="17" width="18" height="4" rx="1" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-48 bg-gray-100 border-r border-gray-300 overflow-y-auto p-2">
          <div className="text-xs font-bold uppercase text-gray-500 mb-1 pl-2">Favorites</div>
          <div
            className="flex items-center px-2 py-1 rounded hover:bg-blue-500 hover:text-white cursor-default"
            onClick={() => navigateTo("/Users/User")}
          >
            <Home className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-sm text-gray-700">Home</span>
          </div>
          <div
            className="flex items-center px-2 py-1 rounded hover:bg-blue-500 hover:text-white cursor-default"
            onClick={() => navigateTo("/Users/User/Desktop")}
          >
            <FolderOpen className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-sm text-gray-700">Desktop</span>
          </div>
          <div
            className="flex items-center px-2 py-1 rounded hover:bg-blue-500 hover:text-white cursor-default"
            onClick={() => navigateTo("/Users/User/Documents")}
          >
            <FileText className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-sm text-gray-700">Documents</span>
          </div>
          <div
            className="flex items-center px-2 py-1 rounded hover:bg-blue-500 hover:text-white cursor-default"
            onClick={() => navigateTo("/Users/User/Downloads")}
          >
            <Download className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-sm text-gray-700">Downloads</span>
          </div>

          <div className="text-xs font-bold uppercase text-gray-500 mt-4 mb-1 pl-2">System</div>
          <div
            className="flex items-center px-2 py-1 rounded hover:bg-blue-500 hover:text-white cursor-default"
            onClick={() => navigateTo("/")}
          >
            <HardDrive className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-sm text-gray-700">Hard Drive</span>
          </div>
          <div
            className="flex items-center px-2 py-1 rounded hover:bg-blue-500 hover:text-white cursor-default"
            onClick={() => navigateTo("/Applications")}
          >
            <Database className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-sm text-gray-700">Applications</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2" onContextMenu={(e) => handleContextMenu(e)}>
          {isCreatingNew && (
            <div className="mb-4 p-2 bg-blue-100 rounded">
              <div className="flex items-center mb-2">
                <span className="text-sm font-medium mr-2">Create new {newItemType}:</span>
                <input
                  type="text"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => {
                     if (e.key === 'Enter') handleCreateNewItem();
                     if (e.key === 'Escape') setIsCreatingNew(false);
                  }}
                  onBlur={() => setIsCreatingNew(false)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                  onClick={() => setIsCreatingNew(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                  onClick={handleCreateNewItem}
                >
                  Create
                </button>
              </div>
            </div>
          )}

          {directoryContents.length === 0 && !isCreatingNew && renamingItemId === null ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FolderOpen className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">This folder is empty</p>
              <button
                className="mt-4 px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center"
                onClick={() => {
                  setNewItemType("file")
                  setNewItemName("Untitled.txt")
                  setIsCreatingNew(true)
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Create a file
              </button>
            </div>
          ) : viewMode === "icon" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-4">
              {directoryContents.map((item) => (
                 renamingItemId === item.id ? (
                  <div key={`${item.id}-renaming`} className="flex flex-col items-center p-2"> 
                    <div className="w-12 h-12 mb-1">{getItemIcon(item)}</div>
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renamingItemName}
                      onChange={(e) => setRenamingItemName(e.target.value)}
                      onKeyDown={handleRenameInputKeyDown}
                      onBlur={handleConfirmRename}
                      className="text-xs text-center border rounded px-1 w-full bg-white outline-none ring-1 ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                 ) : (
                  <div
                    key={item.id}
                    className={`flex flex-col items-center p-2 rounded cursor-default ${ 
                      selectedItem?.id === item.id ? "bg-blue-200" : "hover:bg-blue-100"
                    }`}
                    onClick={() => handleItemClick(item)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    <div className="w-12 h-12 mb-1">{getItemIcon(item)}</div>
                    <span className="text-xs text-center break-words text-black">{item.name}</span>
                  </div>
                 )
              ))}
              {isCreatingNew && (
                <div className="flex flex-col items-center p-2">
                  <div className="w-12 h-12 mb-1">
                    {newItemType === "file" ? (
                      <File className="w-full h-full text-gray-500" />
                    ) : (
                      <FolderOpen className="w-full h-full text-yellow-500" />
                    )}
                  </div>
                  <span className="text-xs text-center break-words text-black italic opacity-50">Creating...</span> 
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {directoryContents.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center p-1 ${
                    renamingItemId === item.id ? "bg-blue-100" : 
                    selectedItem?.id === item.id ? "bg-blue-500 text-white" : "hover:bg-gray-100"
                  }`}
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                >
                  <div className="relative w-6 h-6 mr-2 flex items-center justify-center">{getItemIcon(item)}</div>
                  {renamingItemId === item.id ? (
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renamingItemName}
                      onChange={(e) => setRenamingItemName(e.target.value)}
                      onKeyDown={handleRenameInputKeyDown}
                      onBlur={handleConfirmRename}
                      className="text-sm flex-1 border rounded px-1 py-0 bg-white outline-none ring-1 ring-blue-500 h-6"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-sm flex-1 truncate pr-2">{item.name}</span>
                  )}
                  {renamingItemId !== item.id && (
                    <span className={`ml-auto text-xs flex-shrink-0 ${selectedItem?.id === item.id ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(item.modifiedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="h-6 bg-gray-100 border-t border-gray-300 flex items-center px-3 text-xs text-gray-600">
        {directoryContents.length} items
      </div>
    </div>
  )
}

const id = Math.random().toString(36).substring(7);
