"use client"

import type React from "react"
import html2canvas from 'html2canvas';

import { useState, useRef, useEffect } from "react"
import { useWindow, type WindowPosition } from "@/components/window-context"
import { motion, AnimatePresence } from "framer-motion"
import FileManager from "@/components/apps/file-manager"
import Notepad from "@/components/apps/notepad"
import Browser from "@/components/apps/browser"
import SystemPreferences from "@/components/apps/system-preferences"

interface WindowProps {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  position: WindowPosition
  isActive: boolean
  isMinimized: boolean
  isMaximized?: boolean
  zIndex: number
  component: string
  props?: Record<string, any>
  minimizeAnimation?: {
    startPosition: WindowPosition
    targetPosition: { x: number; y: number }
  }
}

export default function Window({
  id,
  title,
  subtitle,
  icon,
  position,
  isActive,
  isMinimized,
  isMaximized,
  zIndex,
  component,
  props,
  minimizeAnimation,
}: WindowProps) {
  const {
    closeWindow,
    minimizeWindow,
    activateWindow,
    updateWindowPosition,
    updateWindowSize,
    toggleMaximize,
    clearMinimizeAnimation,
  } = useWindow()
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const windowRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Handle window activation on click
  const handleWindowClick = () => {
    if (!isActive) {
      activateWindow(id)
    }
  }

  // Start dragging the window
  const handleTitleBarMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left mouse button

    // Don't start dragging if we clicked on a button
    if (
      (e.target as HTMLElement).tagName === "BUTTON" ||
      (e.target as HTMLElement).parentElement?.tagName === "BUTTON"
    ) {
      return
    }

    e.preventDefault()

    // Get the current window position from the DOM instead of state
    // This ensures we have the most up-to-date position
    const windowElement = windowRef.current
    if (!windowElement) return

    const windowRect = windowElement.getBoundingClientRect()

    // Calculate the exact offset where the user clicked relative to the window
    const exactDragOffset = {
      x: e.clientX - windowRect.left,
      y: e.clientY - windowRect.top,
    }

    setDragOffset(exactDragOffset)
    setIsDragging(true)
  }

  // Start resizing the window
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left mouse button
    e.preventDefault()
    e.stopPropagation()

    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: position.width,
      height: position.height,
    })

    // Activate window if it's not already active
    if (!isActive) {
      activateWindow(id)
    }
  }

  // Handle mouse movement while dragging or resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && windowRef.current) {
        // Calculate the new position with the exact offset
        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y

        // Update window position
        updateWindowPosition(id, {
          x: newX,
          y: newY,
        })
      } else if (isResizing) {
        // Calculate new width and height
        const newWidth = resizeStart.width + (e.clientX - resizeStart.x)
        const newHeight = resizeStart.height + (e.clientY - resizeStart.y)

        // Update window size
        updateWindowSize(id, {
          width: newWidth,
          height: newHeight,
        })
      }
    }

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
      }
      if (isResizing) {
        setIsResizing(false)
      }
    }

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)

      // Add appropriate cursor class
      if (isDragging) {
        document.body.classList.add("cursor-grabbing")
      } else if (isResizing) {
        document.body.classList.add("cursor-resizing")
      }
    } else {
      document.body.classList.remove("cursor-grabbing")
      document.body.classList.remove("cursor-resizing")
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.classList.remove("cursor-grabbing")
      document.body.classList.remove("cursor-resizing")
    }
  }, [
    isDragging,
    isResizing,
    dragOffset,
    resizeStart,
    id,
    updateWindowPosition,
    updateWindowSize,
    activateWindow,
    isActive,
  ])

  // Handle animation completion
  const handleAnimationComplete = () => {
    if (isMinimized && minimizeAnimation) {
      clearMinimizeAnimation(id)
    }
  }

  // Helper function to determine which app this window belongs to
  const getAppIdFromComponent = (componentName: string) => {
    switch (componentName) {
      case "FileManager":
        return "filemanager"
      case "Notepad":
        return "textedit"
      case "Browser":
        return "browser"
      default:
        return componentName.toLowerCase()
    }
  }

  // Handle minimize click with snapshot
  const handleMinimizeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let thumbnailUrl: string | null = null;
    let targetPosition: { x: number; y: number } | undefined = undefined;

    // Attempt to generate thumbnail
    if (contentRef.current) {
      try {
        const canvas = await html2canvas(contentRef.current, {
            logging: false, // Disable logging for cleaner console
            useCORS: true, // If content might load cross-origin resources
            scale: 0.5, // Scale down snapshot for smaller size/better performance
            height: contentRef.current.scrollHeight, // Capture full scroll height
            width: contentRef.current.scrollWidth, // Capture full scroll width
        });
        thumbnailUrl = canvas.toDataURL('image/png', 0.7); // Use PNG, compress slightly
      } catch (error) {
        console.error("Error generating window thumbnail:", error);
        // Proceed without thumbnail if snapshot fails
      }
    }

    // Determine target position (reuse existing logic)
    const appId = getAppIdFromComponent(component);
    if (appId && window.handleMinimizeToApp) {
      // Note: handleMinimizeToApp needs to be adapted or removed if 
      // target position calculation moves entirely here or to context.
      // For now, assume it still sets targetPosition implicitly or we get it some other way.
      // Let's call minimizeWindow directly for clarity, assuming targetPosition is known.
      
      // TEMPORARY: Need a robust way to get targetPosition from Dock
      // For now, let minimizeWindow in context handle default placement.
      console.warn("[Window] handleMinimizeToApp logic needs review for target position calculation.");
      // Example: Call original handler just to potentially get position?
      // window.handleMinimizeToApp(id, appId); 
      // Then call the *real* minimizeWindow with thumbnail:
      // minimizeWindow(id, targetPosition, thumbnailUrl);

      // *** Simplified approach for now: Let context handle default placement ***
       minimizeWindow(id, undefined, thumbnailUrl); // Pass undefined for position

    } else {
      // Fallback if no specific dock app target is found
      minimizeWindow(id, undefined, thumbnailUrl); // Pass undefined for position
    }
  };

  // Render the appropriate component based on the component prop
  const renderComponent = () => {
    switch (component) {
      case "FileManager":
        return <FileManager {...props} />
      case "Notepad":
        return <Notepad {...props} />
      case "Browser":
        return <Browser {...props} />
      case "SystemPreferences":
        return <SystemPreferences {...props} />
      default:
        return <div>Unknown component: {component}</div>
    }
  }

  // Determine animation properties based on window state
  const getAnimationProps = () => {
    if (isMinimized && minimizeAnimation) {
      // Minimize animation - shrink and move to target position
      return {
        initial: {
          left: minimizeAnimation.startPosition.x,
          top: minimizeAnimation.startPosition.y,
          width: minimizeAnimation.startPosition.width,
          height: minimizeAnimation.startPosition.height,
          scale: 1,
          opacity: 1,
        },
        animate: {
          left: minimizeAnimation.targetPosition.x,
          top: minimizeAnimation.targetPosition.y,
          width: 0,
          height: 0,
          scale: 0.1,
          opacity: 0,
        },
        exit: {
          left: minimizeAnimation.startPosition.x,
          top: minimizeAnimation.startPosition.y,
          width: minimizeAnimation.startPosition.width,
          height: minimizeAnimation.startPosition.height,
          scale: 1,
          opacity: 1,
        },
        transition: { duration: 0.3, ease: "easeInOut" },
        onAnimationComplete: handleAnimationComplete,
      }
    }

    // Default animation for opening/closing
    return {
      initial: { scale: 0.9, opacity: 0 },
      animate: {
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
        scale: 1,
        opacity: 1,
      },
      exit: { scale: 0.9, opacity: 0 },
      transition: { duration: 0.15 },
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={windowRef}
        className={`absolute rounded-lg overflow-hidden shadow-xl border border-gray-400/50 flex flex-col ${
          isActive ? "shadow-2xl" : "shadow-md"
        }`}
        style={{
          zIndex,
          display: isMinimized && !minimizeAnimation ? 'none' : 'flex',
        }}
        onClick={handleWindowClick}
        {...getAnimationProps()}
      >
        {/* Window title bar */}
        <div
          className={`h-6 flex items-center px-2 ${
            isActive ? "bg-gradient-to-b from-gray-300 to-gray-200" : "bg-gradient-to-b from-gray-200 to-gray-100"
          }`}
          onMouseDown={handleTitleBarMouseDown}
          onDoubleClick={() => toggleMaximize(id)}
        >
          {/* Window controls */}
          <div className="flex items-center space-x-1.5 mr-2">
            <button
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation()
                closeWindow(id)
              }}
            >
              {isActive && <span className="text-red-800 text-[8px] font-bold">×</span>}
            </button>
            <button
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center"
              onClick={handleMinimizeClick}
            >
              {isActive && <span className="text-yellow-800 text-[8px] font-bold">−</span>}
            </button>
            <button
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation()
                toggleMaximize(id)
              }}
            >
              {isActive && <span className="text-green-800 text-[8px] font-bold">+</span>}
            </button>
          </div>

          {/* Window Title */}
          <div className="flex-1 text-center truncate flex items-center justify-center space-x-2">
            <span className={`text-xs font-medium ${isActive ? "text-gray-800" : "text-gray-300"}`}>
              {title}
            </span>
            {subtitle && (
              <span className={`text-xs ${isActive ? "text-gray-700" : "text-gray-400"} font-normal`}>
                {subtitle}
              </span>
            )}
          </div>

          {/* Empty space for symmetry */}
          <div className="w-12"></div>
        </div>

        {/* Window content */}
        <div ref={contentRef} className="flex-1 bg-white overflow-hidden">{renderComponent()}</div>

        {/* Window resize handle */}
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10" onMouseDown={handleResizeMouseDown}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute bottom-0 right-0 opacity-50"
          >
            <path d="M14 14L8 14L14 8L14 14Z" fill="#888888" />
            <path d="M10 14L14 10L14 14L10 14Z" fill="#666666" />
          </svg>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
