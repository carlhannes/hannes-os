"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import DesktopIcon from "@/components/desktop-icon"
import { useFileSystem } from "@/lib/file-system/file-system-context"
import type { FileSystemEntity, Link, LinkTargetType } from "@/lib/file-system/types"
import { useWindow } from "@/components/window-context"
import { useContextMenu } from "@/components/context-menu-provider"
import { useDialog } from "@/components/dialogs/dialog-context"
import { useApp } from "@/components/app-context"
import { FolderPlus, Link as LinkIcon, Globe, Tv, Star, RefreshCw, Brush } from "lucide-react"
import { useSettings } from "@/lib/settings/settings-context" 
import DesktopBackgroundWrapper from "./desktop-background-wrapper" 
import { useFileOpener } from "@/lib/hooks/useFileOpener"

const GRID_SIZE = 80 // Size of the grid cells for snapping
const DESKTOP_PATH = "/Users/User/Desktop"; // Define DESKTOP_PATH locally

// Helper function to snap to grid
// ... existing code ...

export default function Desktop() {
  const {
    getEntityByPath,
    listDirectory,
    updateEntityMetadata,
    renameEntity,
    createDirectory,
    createLink, // Ensure createLink is imported from useFileSystem
    getPath,
    initialized, // Get the initialized state from the context
    fsVersion,   // Get the file system version
  } = useFileSystem()
  const { openWindow } = useWindow()
  const { showContextMenu } = useContextMenu()
  const { showCreateLinkDialog, showErrorDialog } = useDialog()
  const { getAppById } = useApp()
  const { settings } = useSettings() 
  const { openEntity } = useFileOpener()

  const [desktopItems, setDesktopItems] = useState<FileSystemEntity[]>([])
  const [desktopId, setDesktopId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [renamingItemName, setRenamingItemName] = useState<string>("");
  const desktopRef = useRef<HTMLDivElement>(null);
  const draggedItemRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  // Load desktop items on mount
  const loadDesktopItems = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log(`[Desktop] Loading items for path: ${DESKTOP_PATH}`);
      const dirEntity = await getEntityByPath(DESKTOP_PATH);

      if (!dirEntity || dirEntity.type !== 'directory') {
        throw new Error("Desktop directory not found or is not a directory.");
      }

      const currentDesktopId = dirEntity.id;
      setDesktopId(currentDesktopId); // Set the desktop ID state
      console.log(`[Desktop] Found Desktop directory ID: ${currentDesktopId}`);

      const items = await listDirectory(currentDesktopId);
      console.log("[Desktop] Loaded items:", items);
      setDesktopItems(items);

    } catch (error) {
      console.error("Error loading desktop items:", error);
      const message = error instanceof Error ? error.message : String(error);
      showErrorDialog(`Could not load Desktop items: ${message}`);
      setDesktopItems([]); // Clear items on error
      setDesktopId(null);
    } finally {
      setIsLoading(false);
    }
  }, [getEntityByPath, listDirectory, showErrorDialog, fsVersion]); // <-- Add fsVersion dependency

  useEffect(() => {
    // Only load items if the file system is initialized
    if (initialized) {
      console.log("[Desktop] FileSystem initialized, loading items.");
      loadDesktopItems();
    } else {
      console.log("[Desktop] FileSystem not yet initialized, waiting...");
    }
  }, [initialized, loadDesktopItems]); // Add initialized to dependency array

  // ... other handlers like handleStartRename, handleCancelRename, handleFinishRename ...

  // Define handleCreateLink callback function - MODIFIED: Now receives type explicitly
  const handleCreateLinkWithType = async (name: string, target: string, type: LinkTargetType) => {
    if (!desktopId) {
        showErrorDialog("Could not determine Desktop location.");
        return;
    }
    try {
        // createLink now uses the explicitly passed type
        const result = await createLink(name, desktopId, type, target);
        if (result.success) {
            loadDesktopItems(); // Reload desktop items
        } else {
            showErrorDialog(result.error || "Failed to create link.");
        }
    } catch (error: any) {
        showErrorDialog(`Error creating link: ${error.message}`);
    }
  };

  // Define handleCreateFolder function
  const handleCreateFolder = async () => {
      if (!desktopId) {
          showErrorDialog("Could not determine Desktop location.");
          return;
      }
      // Find a unique name
      let folderName = "Untitled Folder";
      let counter = 1;
      const existingNames = new Set(desktopItems.map(item => item.name));
      while (existingNames.has(folderName + (counter > 1 ? ` ${counter}` : ""))) {
          counter++;
      }
      if (counter > 1) {
          folderName = `${folderName} ${counter}`;
      }

      try {
          const result = await createDirectory(folderName, desktopId);
          if (result.success) {
              loadDesktopItems();
              // Optionally start renaming the new folder
              // setRenamingItemId(result.data.id);
              // setRenamingItemName(result.data.name);
          } else {
              showErrorDialog(result.error || "Failed to create folder.");
          }
      } catch (error: any) {
          showErrorDialog(`Error creating folder: ${error.message}`);
      }
  };

  // Define handleCleanUp function
  const handleCleanUp = useCallback(async () => {
     if (!desktopRef.current || desktopItems.length === 0) return;

     const desktopRect = desktopRef.current.getBoundingClientRect();
     const availableWidth = desktopRect.width - GRID_SIZE; // Leave some padding
     const itemsPerRow = Math.max(1, Math.floor(availableWidth / GRID_SIZE));
     
     const updates = desktopItems.map((item, index) => {
         const row = Math.floor(index / itemsPerRow);
         const col = index % itemsPerRow;
         const newX = col * GRID_SIZE + GRID_SIZE / 2; // Center in grid cell approx
         const newY = row * GRID_SIZE + GRID_SIZE / 2;

         // Only update if position actually changes, use correct keys
         if (item.metadata?.desktopX !== newX || item.metadata?.desktopY !== newY) {
             return updateEntityMetadata(item.id, { desktopX: newX, desktopY: newY }); // Use desktopX, desktopY
         }
         return Promise.resolve(); // No update needed
     });

     try {
         await Promise.all(updates);
         loadDesktopItems(); // Refresh positions visually
     } catch (error) {
         console.error("Error during clean up:", error);
         showErrorDialog("An error occurred while cleaning up icons.");
     }
 }, [desktopItems, updateEntityMetadata, loadDesktopItems, showErrorDialog]);


  // Handle background right-click
  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (renamingItemId) return;

    showContextMenu(e, [
      { label: "New Folder", action: handleCreateFolder }, // Use correct handler
      {
        label: "New Link...",
        submenu: [
          // Pass type explicitly in the callback to showCreateLinkDialog
          { label: "Application Link...", action: () => showCreateLinkDialog('application', (name, target) => handleCreateLinkWithType(name, target, 'application')) }, 
          { label: "Folder Link...", action: () => showCreateLinkDialog('directory', (name, target) => handleCreateLinkWithType(name, target, 'directory')) },
          { label: "File Link...", action: () => showCreateLinkDialog('file', (name, target) => handleCreateLinkWithType(name, target, 'file')) }, 
          { label: "URL Link...", action: () => showCreateLinkDialog('url', (name, target) => handleCreateLinkWithType(name, target, 'url')) },
        ]
      },
      { separator: true }, 
      { label: "Clean Up", action: handleCleanUp }, // Use correct handler
    ]);
  };

  // Handle clicking outside icons (to cancel rename)
  const handleClickOutsideIcon = (e: React.MouseEvent) => {
      // If the click is directly on the desktop background (not an icon or input)
      if (e.target === desktopRef.current && renamingItemId) {
          handleFinishRename(); // Or handleCancelRename() depending on desired behavior
      }
  };

   // Define handleItemDoubleClick/SingleClick - REPLACED with call to openEntity
   // const handleItemClickAction = async (item: FileSystemEntity) => { ... }
   // No longer needed as the logic is in useFileOpener

   const handleFinishRename = async () => {
    if (!renamingItemId || !renamingItemName) return;
    const originalItem = desktopItems.find(item => item.id === renamingItemId);
    if (!originalItem || originalItem.name === renamingItemName) {
      // Name didn't change or item not found
      setRenamingItemId(null);
      setRenamingItemName("");
      return;
    }

    try {
      const result = await renameEntity(renamingItemId, renamingItemName);
      if (!result.success) {
        showErrorDialog(result.error || "Failed to rename item.");
        // Optionally revert name in UI
        setRenamingItemName(originalItem.name);
      }
      // Refresh desktop items whether rename succeeded or failed (to ensure UI consistency)
      loadDesktopItems(); 
    } catch (error: any) {
      showErrorDialog(`Error renaming item: ${error.message}`);
       setRenamingItemName(originalItem.name); // Revert on error
    } finally {
      setRenamingItemId(null);
      setRenamingItemName("");
    }
  };

  const handleSavePosition = useCallback(async (id: string, x: number, y: number) => {
    // Basic debouncing or direct update
    console.log(`[Desktop] Request to save position for ${id}: (${x}, ${y})`);
    // Snap to grid before saving
    const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;

    // Update visual state immediately (optional, motion.div might handle it)
    setDesktopItems(prev => prev.map(itm => 
        itm.id === id ? { ...itm, metadata: { ...(itm.metadata || {}), desktopX: snappedX, desktopY: snappedY } } : itm
    ));

    try {
        // Call file system to update metadata
        const result = await updateEntityMetadata(id, { desktopX: snappedX, desktopY: snappedY });
        if (!result.success) {
            console.error(`Failed to save position for ${id}:`, result.error);
            // Optionally show error or revert position
            showErrorDialog(result.error || `Failed to save position for ${renamingItemName}.`);
            loadDesktopItems(); // Revert visual state on error
        }
    } catch (error) {
        console.error(`Error saving position for ${id}:`, error);
        showErrorDialog(`Error saving position: ${error instanceof Error ? error.message : String(error)}`);
        loadDesktopItems(); // Revert visual state on error
    }
  }, [updateEntityMetadata, showErrorDialog, loadDesktopItems, renamingItemName]); // Add dependencies

  return (
    <div
      ref={desktopRef}
      className="flex-1 relative overflow-hidden select-none"
      onContextMenu={handleBackgroundContextMenu} // Use correct handler
      onClick={handleClickOutsideIcon} // Use correct handler
    >
      {/* Render the dynamic background */}
      <DesktopBackgroundWrapper />

      {desktopItems.map((item) => (
        <DesktopIcon
          key={item.id}
          entity={item} 
          dragConstraintsRef={desktopRef} 
          onSavePosition={handleSavePosition} 
          // Correct rename props:
          isRenaming={renamingItemId === item.id}
          currentName={renamingItemId === item.id ? renamingItemName : item.name} 
          onNameChange={(e) => setRenamingItemName(e.target.value)} 
          onStartRename={(entityToRename) => { 
              setRenamingItemId(entityToRename.id);
              setRenamingItemName(entityToRename.name);
          }}
          onConfirmRename={handleFinishRename} 
          onCancelRename={() => { 
              setRenamingItemId(null);
              setRenamingItemName("");
          }}
          onDoubleClick={() => openEntity(item)} // Call openEntity directly
        />
      ))}

      {/* Drag overlay - Optional visual feedback */}
      {/* ... */}
    </div>
  );
}
