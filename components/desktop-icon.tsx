"use client"

import React, { useRef, useEffect } from "react"
import { motion, type PanInfo } from "framer-motion"
import type { FileSystemEntity, Link } from "@/lib/file-system/types"
import { useApp } from "@/components/app-context"
import { useContextMenu, type MenuItem } from "@/components/context-menu-provider"
import { FileText, FolderOpen, Database, Globe, Link as LinkIcon } from "lucide-react"
import { useFileSystem } from "@/lib/file-system/file-system-context"
import { useDialog } from "@/components/dialogs/dialog-context"
import { useFileOpener } from "@/lib/hooks/useFileOpener"

interface DesktopIconProps {
  entity: FileSystemEntity
  onSavePosition: (id: string, x: number, y: number) => void
  onDoubleClick: (entity: FileSystemEntity) => void
  dragConstraintsRef: React.RefObject<HTMLElement | null>
  // Rename props
  isRenaming: boolean
  currentName: string
  onNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onConfirmRename: () => void
  onCancelRename: () => void
  onStartRename: (entity: FileSystemEntity) => void
  // TODO: Add onDelete prop
}

// Function to get appropriate icon (similar to FileManager, maybe centralize later)
const getItemIcon = (item: FileSystemEntity, getAppById: Function) => {
  let baseIcon: React.ReactNode = null

  if (item.type === "link") {
    const link = item as Link
    switch (link.targetType) {
      case "application":
        const appInfo = getAppById(link.target)
        baseIcon = appInfo ? appInfo.icon : <Database className="w-full h-full text-gray-500" />
        break
      case "directory":
        baseIcon = <FolderOpen className="w-full h-full text-yellow-500" />
        break
      case "file":
        baseIcon = <FileText className="w-full h-full text-gray-500" />
        break
      case "url":
        baseIcon = <Globe className="w-full h-full text-purple-500" />
        break
      default:
        baseIcon = <FileText className="w-full h-full text-gray-500" />
    }
    // Wrap the base icon and add the overlay
    return (
      <div className="relative w-full h-full">
        {baseIcon}
        <LinkIcon className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-full p-px text-blue-600 shadow" />
      </div>
    )
  } else if (item.type === "directory") {
    return <FolderOpen className="w-full h-full text-yellow-500" />
  } else if (item.type === "file") {
    return <FileText className="w-full h-full text-gray-500" />
  } else if (item.type === "application") { // Legacy type
    const appInfo = getAppById(item.appId)
    return appInfo ? appInfo.icon : <Database className="w-full h-full text-gray-500" />
  }

  return <FileText className="w-full h-full text-gray-500" />
}

export default function DesktopIcon({ 
    entity,
    onSavePosition,
    onDoubleClick,
    dragConstraintsRef,
    // Rename props
    isRenaming,
    currentName,
    onNameChange,
    onConfirmRename,
    onCancelRename,
    onStartRename
}: DesktopIconProps) {
  const { getAppById, getAppsForExtension } = useApp()
  const { showContextMenu } = useContextMenu()
  const { deleteEntity } = useFileSystem()
  const { showErrorDialog } = useDialog()
  const { openEntity } = useFileOpener()
  const inputRef = useRef<HTMLInputElement>(null); // Ref for the input field

  // Focus and select text when renaming starts
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Adjust position based on potential container offset if needed
    // For now, assume point.x/y are relative to the constrained parent
    onSavePosition(entity.id, info.point.x, info.point.y)
  }

  // Context Menu for the icon itself
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent desktop context menu from showing

    // --- Build Menu Items Dynamically ---
    const menuItems: MenuItem[] = [
        { label: "Open", action: () => openEntity(entity) }, // Use hook
    ];

    // Add "Open With..." submenu for files
    if (entity.type === 'file') {
        const applicableApps = getAppsForExtension(entity.name);
        if (applicableApps.length > 1) { // Only show if more than one app applies
             menuItems.push({ separator: true });
             menuItems.push({
                 label: "Open With",
                 submenu: applicableApps.map(app => ({
                     label: app.name,
                     // Use openEntity with the specific app ID
                     action: () => openEntity(entity, app.id) 
                 }))
             });
        }
    }

    // Add standard items
    menuItems.push({ separator: true });
    menuItems.push({ label: "Rename", action: () => onStartRename(entity) });
    menuItems.push({ label: "Get Info", action: () => console.log("TODO: Get Info for", entity.id) });
    menuItems.push({ separator: true });
    menuItems.push({
        label: "Delete",
        action: async () => {
            console.log("Attempting to delete:", entity.name);
            try {
                const result = await deleteEntity(entity.id);
                if (!result.success) {
                    showErrorDialog(result.error || "Failed to delete item.");
                }
                // Desktop will auto-refresh due to fsVersion change
            } catch (error) {
                 showErrorDialog(`Error deleting item: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    });

    showContextMenu(e, menuItems);
  };

  // Handle keydown in input field
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          onConfirmRename();
      } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancelRename();
      }
  };

  // Determine initial position from metadata or default
  const initialX = entity.metadata?.desktopX
  const initialY = entity.metadata?.desktopY
  const positionStyle = initialX !== undefined && initialY !== undefined
    ? { position: 'absolute' as const, left: initialX, top: initialY }
    : { position: 'relative' as const } // Default to relative flow if no position saved

  return (
    <motion.div
      key={entity.id} // Ensure re-render if entity changes
      drag={!isRenaming} // Disable drag while renaming
      dragConstraints={dragConstraintsRef} // Use the ref passed from Desktop
      dragMomentum={false} // Optional: makes dragging feel less floaty
      onDragEnd={handleDragEnd}
      onDoubleClick={() => { if (!isRenaming) onDoubleClick(entity); }} // Prevent double click while renaming
      onContextMenu={handleContextMenu} // Add context menu handler
      className={`p-2 rounded focus:outline-none w-20 h-24 flex flex-col items-center justify-start ${!isRenaming ? 'cursor-grab hover:bg-black/10 focus:bg-blue-500/30' : 'cursor-default bg-blue-500/30'}`}
      style={positionStyle}
      // Apply initial position directly if absolute
      initial={positionStyle.position === 'absolute' ? { x: 0, y: 0 } : false} // Prevent initial animation jump if absolute
      title={isRenaming ? "" : entity.name} // Hide tooltip when renaming
    >
      <div className="w-12 h-12 mb-1">
        {getItemIcon(entity, getAppById)}
      </div>
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={currentName}
          onChange={onNameChange}
          onKeyDown={handleInputKeyDown}
          onBlur={onConfirmRename} // Confirm rename on blur
          className="text-xs text-center text-black bg-white border border-blue-500 rounded px-1 w-full outline-none shadow-inner"
          onClick={(e) => e.stopPropagation()} // Prevent click from propagating
          onDoubleClick={(e) => e.stopPropagation()} // Prevent double-click
        />
      ) : (
        <span 
           className="text-xs text-center text-white font-medium break-words overflow-hidden" 
           style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }} // Classic Mac OS text shadow
        >
          {/* Remove .lnk extension for display */}
          {entity.name.replace(".lnk", "")}
        </span>
      )}
    </motion.div>
  )
}
