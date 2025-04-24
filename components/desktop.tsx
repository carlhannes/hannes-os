"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import DesktopIcon from "@/components/desktop-icon"
import { useFileSystem } from "@/lib/file-system/file-system-context"
import type { FileSystemEntity, Link, LinkTargetType } from "@/lib/file-system/types"
import { useWindow } from "@/components/window-context"
import { useApp } from "@/components/app-context"
import { useContextMenu } from "@/components/context-menu-provider"
import { useDialog } from "@/components/dialogs/dialog-context"

// Simple debounce function using setTimeout
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}

const DESKTOP_PATH = "/Users/User/Desktop"

export default function Desktop() {
  const {
    initialized,
    listDirectoryByPath,
    updateEntityMetadata,
    getPath,
    getEntityByPath,
    createLink,
    listDirectory,
    fsVersion,
    createDirectory,
    renameEntity,
  } = useFileSystem()
  const { openWindow } = useWindow()
  const { showContextMenu } = useContextMenu()
  const { getAppById } = useApp()
  const { showErrorDialog, showCreateLinkDialog } = useDialog()

  const [desktopItems, setDesktopItems] = useState<FileSystemEntity[]>([])
  const [desktopDirId, setDesktopDirId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const desktopRef = useRef<HTMLDivElement>(null)

  // State for inline renaming
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null)
  const [renamingItemName, setRenamingItemName] = useState<string>("")

  const refreshDesktopItems = useCallback(async () => {
    if (!initialized) return
    setIsLoading(true)
    try {
      console.log(`[Desktop] Refreshing contents for path: ${DESKTOP_PATH}`)
      let currentDesktopDirId = desktopDirId
      if (!currentDesktopDirId) {
        const dir = await getEntityByPath(DESKTOP_PATH)
        if (dir && dir.type === 'directory') {
          currentDesktopDirId = dir.id
          setDesktopDirId(dir.id)
        } else {
          throw new Error("Desktop directory not found or is not a directory")
        }
      }
      if (!currentDesktopDirId) {
        throw new Error("Desktop directory ID not found")
      }
      console.log(`[Desktop] Listing directory ID: ${currentDesktopDirId}`);
      const items = await listDirectory(currentDesktopDirId);
      console.log("[Desktop] Refreshed items:", items);
      setDesktopItems(items);
    } catch (error) {
      console.error("Error loading/refreshing desktop items:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showErrorDialog(`Could not load desktop items: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [initialized, getEntityByPath, listDirectory, showErrorDialog, desktopDirId, fsVersion]);

  useEffect(() => {
    if (initialized) {
      refreshDesktopItems()
    }
  }, [initialized, refreshDesktopItems])

  const debouncedSavePosition = useCallback(
    debounce(async (id: string, x: number, y: number) => {
      console.log(`[Desktop] Saving position for ${id}: (${x}, ${y})`)
      const result = await updateEntityMetadata(id, { desktopX: x, desktopY: y })
      if (!result.success) {
        console.error("Failed to save icon position:", result.error)
      }
    }, 300),
    [updateEntityMetadata]
  )

  const handleSavePosition = (id: string, x: number, y: number) => {
    setDesktopItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, metadata: { ...item.metadata, desktopX: x, desktopY: y } } : item
      )
    )
    debouncedSavePosition(id, x, y)
  }

  const handleCleanUpDesktop = useCallback(async () => {
    if (!desktopDirId) return;
    console.log("[Desktop] Cleaning up icons...");
    try {
      const updates = desktopItems.map(item => 
        updateEntityMetadata(item.id, { desktopX: undefined, desktopY: undefined })
      );
      await Promise.all(updates);
      // Positions will reset in DesktopIcon on next render due to undefined metadata
      // Trigger a refresh to visually update layout if necessary (might depend on DesktopIcon logic)
      refreshDesktopItems(); // Refresh to get potentially re-ordered items if sorting is added later
    } catch (error) {
      console.error("Error cleaning up desktop icons:", error);
      showErrorDialog("Failed to clean up desktop icons.");
    }
  }, [desktopItems, updateEntityMetadata, refreshDesktopItems, desktopDirId, showErrorDialog]);

  const handleCreateNewFolder = useCallback(async () => {
    if (!desktopDirId) {
      showErrorDialog("Cannot create folder: Desktop folder not loaded.");
      return;
    }
    // TODO: Implement name collision handling (e.g., "Untitled Folder 2")
    const result = await createDirectory("Untitled Folder", desktopDirId);
    if (result.success) {
      refreshDesktopItems();
    } else {
      console.error("Failed to create folder on desktop:", result.error);
      showErrorDialog(result.error || "Failed to create folder.");
    }
  }, [desktopDirId, createDirectory, refreshDesktopItems, showErrorDialog]);

  // --- Rename Handlers ---
  const handleStartRename = useCallback((item: FileSystemEntity) => {
    setRenamingItemId(item.id);
    setRenamingItemName(item.name);
  }, []);

  const handleCancelRename = useCallback(() => {
    setRenamingItemId(null);
    setRenamingItemName("");
  }, []);

  const handleConfirmRename = useCallback(async () => {
    if (!renamingItemId || !renamingItemName.trim()) {
      handleCancelRename(); // Cancel if name is empty
      return;
    }
    
    const originalItem = desktopItems.find(item => item.id === renamingItemId);
    if (!originalItem || originalItem.name === renamingItemName.trim()) {
        handleCancelRename(); // No change, just cancel
        return;
    }

    console.log(`[Desktop] Renaming item ${renamingItemId} to "${renamingItemName.trim()}"`);
    const result = await renameEntity(renamingItemId, renamingItemName.trim());
    if (result.success) {
      refreshDesktopItems(); // Refresh to show the new name
    } else {
      console.error("Failed to rename item:", result.error);
      showErrorDialog(result.error || "Failed to rename item.");
    }
    handleCancelRename(); // Clear state regardless of success/failure
  }, [renamingItemId, renamingItemName, renameEntity, refreshDesktopItems, showErrorDialog, handleCancelRename, desktopItems]);

  const handleItemDoubleClick = async (item: FileSystemEntity) => {
    // Prevent double-click from triggering if renaming
    if (renamingItemId === item.id) return;

    console.log("[Desktop] Double click:", item)
    if (item.type === "directory") {
      openWindow({
        title: "File Manager",
        subtitle: item.name,
        icon: "filemanager",
        component: "FileManager",
        position: { x: 100, y: 100, width: 700, height: 500 },
        props: { initialPath: `${DESKTOP_PATH}/${item.name}` }
      })
    } else if (item.type === "file") {
      openWindow({
        title: "TextEdit",
        subtitle: item.name,
        icon: "textedit",
        component: "Notepad",
        position: { x: 150, y: 150, width: 500, height: 400 },
        props: { fileId: item.id },
      })
    } else if (item.type === "link") {
      const link = item as Link
      switch (link.targetType) {
        case "application":
          const appInfo = getAppById(link.target)
          if (appInfo) {
            openWindow({
              title: appInfo.name,
              icon: appInfo.id,
              component: appInfo.component,
              position: { ...(appInfo.defaultSize || {width: 500, height: 400}), x: 120, y: 120 },
              props: appInfo.defaultProps || {},
            })
          } else {
            showErrorDialog(`Application not found: ${link.target}`)
          }
          break
        case "directory":
          try {
            const targetPath = await getPath(link.target)
            if (targetPath) {
              openWindow({
                title: "File Manager",
                subtitle: targetPath,
                icon: "filemanager",
                component: "FileManager",
                position: { x: 130, y: 130, width: 700, height: 500 },
                props: { initialPath: targetPath }
              })
            } else {
              showErrorDialog(`Could not resolve path for directory link target: ${link.target}`)
            }
          } catch (error) {
            showErrorDialog(`Error resolving directory link.`)
          }
          break
        case "file":
          openWindow({
            title: "TextEdit",
            subtitle: link.name.replace(".lnk", ""),
            icon: "textedit",
            component: "Notepad",
            position: { x: 140, y: 140, width: 500, height: 400 },
            props: { fileId: link.target },
          })
          break
        case "url":
          openWindow({
            title: "Browser",
            subtitle: link.target,
            icon: "browser",
            component: "Browser",
            position: { x: 150, y: 150, width: 800, height: 600 },
            props: { initialUrl: link.target },
          })
          break
      }
    }
  }

  const handleDesktopContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    showContextMenu(e, [
      { label: "New Folder", action: handleCreateNewFolder },
      { label: "New Link...", submenu: [
        { label: "Application Link...", action: () => handleCreateDesktopLink('application') },
        { label: "Folder Link...", action: () => handleCreateDesktopLink('directory') },
        { label: "File Link...", action: () => handleCreateDesktopLink('file') },
        { label: "URL Link...", action: () => handleCreateDesktopLink('url') },
      ]},
      { separator: true },
      { label: "Clean Up", action: handleCleanUpDesktop },
      { separator: true },
      { label: "Change Desktop Background...", action: () => console.log("TODO: Change BG") },
      { separator: true },
      { label: "Get Info", action: () => console.log("TODO: Get Desktop Info") },
    ])
  }

  const handleCreateDesktopLink = (targetType: LinkTargetType) => {
    if (!desktopDirId) {
      console.error("Desktop directory ID not available yet.");
      showErrorDialog("Cannot create link: Desktop folder not loaded.");
      return;
    }
    
    const parentId = desktopDirId; 

    showCreateLinkDialog(targetType, async (name, target) => {
      console.log(`Creating ${targetType} link named "${name}" pointing to "${target}" in Desktop (${parentId})`);
      const result = await createLink(name, parentId, targetType, target);
      if (result.success) {
        refreshDesktopItems(); 
      } else {
        console.error("Failed to create link on desktop:", result.error);
        showErrorDialog(result.error || "Failed to create link.");
      }
    });
  };

  return (
    <div 
      ref={desktopRef} 
      className="flex-1 p-4 relative"
      onContextMenu={handleDesktopContextMenu}
    >
      {isLoading && <div className="text-white/50 text-center">Loading Desktop...</div>}
      {!isLoading && desktopItems.map((item) => (
        <DesktopIcon
          key={item.id}
          entity={item}
          dragConstraintsRef={desktopRef}
          onSavePosition={handleSavePosition}
          onDoubleClick={handleItemDoubleClick}
          // Rename props
          isRenaming={renamingItemId === item.id}
          currentName={renamingItemName}
          onNameChange={(e) => setRenamingItemName(e.target.value)}
          onConfirmRename={handleConfirmRename}
          onCancelRename={handleCancelRename}
          onStartRename={handleStartRename}
        />
      ))}
    </div>
  )
}
