"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { v4 as uuidv4 } from "uuid"

export type WindowPosition = {
  x: number
  y: number
  width: number
  height: number
}

export type WindowState = {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode | string
  component: string
  position: WindowPosition
  previousPosition?: WindowPosition // Store previous position for maximize/restore
  isActive: boolean
  isMinimized: boolean
  isMaximized: boolean // New property for maximized state
  zIndex: number
  props?: Record<string, any>
  minimizeAnimation?: {
    startPosition: WindowPosition
    targetPosition: { x: number; y: number }
  }
  thumbnail?: string | null // Added thumbnail field
}

type WindowContextType = {
  windows: WindowState[]
  activeWindowId: string | null
  highestZIndex: number
  openWindow: (params: Omit<WindowState, "id" | "isActive" | "isMinimized" | "isMaximized" | "zIndex" | "thumbnail">) => string
  closeWindow: (id: string) => void
  minimizeWindow: (id: string, targetPosition?: { x: number; y: number }, thumbnailUrl?: string | null) => void
  restoreWindow: (id: string) => void
  maximizeWindow: (id: string) => void
  toggleMaximize: (id: string) => void // New function to toggle maximize state
  activateWindow: (id: string) => void
  updateWindowPosition: (id: string, position: Partial<WindowPosition>) => void
  updateWindowSize: (id: string, size: { width: number; height: number }) => void // New function for resizing
  getWindowById: (id: string) => WindowState | undefined
  clearMinimizeAnimation: (id: string) => void // Clear animation data after it's done
}

const WindowContext = createContext<WindowContextType | undefined>(undefined)

export function WindowProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<WindowState[]>([])
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null)
  const [highestZIndex, setHighestZIndex] = useState(0)

  const openWindow = useCallback(
    (params: Omit<WindowState, "id" | "isActive" | "isMinimized" | "isMaximized" | "zIndex" | "thumbnail">) => {
      const newZIndex = highestZIndex + 1
      setHighestZIndex(newZIndex)

      const id = uuidv4()
      const newWindow: WindowState = {
        ...params,
        id,
        isActive: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: newZIndex,
        thumbnail: null, // Initialize thumbnail as null
      }

      setWindows((prev) => {
        // Deactivate all other windows
        const updatedWindows = prev.map((window) => ({
          ...window,
          isActive: false,
        }))
        return [...updatedWindows, newWindow]
      })

      setActiveWindowId(id)
      return id
    },
    [highestZIndex],
  )

  const closeWindow = useCallback(
    (id: string) => {
      setWindows((prev) => {
        const filtered = prev.filter((window) => window.id !== id)

        // If we closed the active window, activate the top-most window
        if (id === activeWindowId && filtered.length > 0) {
          const topWindow = filtered.reduce(
            (highest, current) => (current.zIndex > highest.zIndex ? current : highest),
            filtered[0],
          )

          const updatedWindows = filtered.map((window) => ({
            ...window,
            isActive: window.id === topWindow.id,
          }))

          setActiveWindowId(topWindow.id)
          return updatedWindows
        }

        return filtered
      })

      if (windows.length === 1 && id === activeWindowId) {
        setActiveWindowId(null)
      }
    },
    [windows, activeWindowId],
  )

  const minimizeWindow = useCallback((id: string, targetPosition?: { x: number; y: number }, thumbnailUrl?: string | null) => {
    setWindows((prev) => {
      return prev.map((window) => {
        if (window.id === id) {
          // Store current position for animation
          const startPosition = { ...window.position }

          return {
            ...window,
            isMinimized: true,
            isActive: false,
            thumbnail: thumbnailUrl || null, // Store the thumbnail
            minimizeAnimation: {
              startPosition,
              targetPosition: targetPosition || { x: window.position.x, y: window.position.y + 500 },
            },
          }
        }
        return window
      })
    })

    // Activate the next highest window
    setWindows((prev) => {
      const visibleWindows = prev.filter((w) => !w.isMinimized && w.id !== id)
      if (visibleWindows.length > 0) {
        const topWindow = visibleWindows.reduce(
          (highest, current) => (current.zIndex > highest.zIndex ? current : highest),
          visibleWindows[0],
        )

        setActiveWindowId(topWindow.id)

        return prev.map((window) => ({
          ...window,
          isActive: window.id === topWindow.id,
        }))
      }

      setActiveWindowId(null)
      return prev
    })
  }, [])

  const clearMinimizeAnimation = useCallback((id: string) => {
    setWindows((prev) => {
      return prev.map((window) => {
        if (window.id === id) {
          const { minimizeAnimation, ...rest } = window
          return rest
        }
        return window
      })
    })
  }, [])

  const activateWindow = useCallback(
    (id: string) => {
      const newZIndex = highestZIndex + 1
      setHighestZIndex(newZIndex)

      setWindows((prev) => {
        return prev.map((window) => {
          // When activating, make sure the window is not minimized
          if (window.id === id) {
            return { ...window, isActive: true, zIndex: newZIndex, isMinimized: false, thumbnail: null }; // Clear thumbnail on activate
          }
          return { ...window, isActive: false };
        });
      });

      setActiveWindowId(id)
    },
    [highestZIndex]
  )

  // Moved restoreWindow after activateWindow
  const restoreWindow = useCallback((id: string) => {
      // Find the window and set isMinimized to false
      setWindows((prev) =>
          prev.map((window) => {
              if (window.id === id) {
                  return {
                      ...window,
                      isMinimized: false,
                      minimizeAnimation: undefined, // Clear any animation data
                      thumbnail: null, // Clear thumbnail on restore
                  };
              }
              return window;
          })
      );
      // Activate the restored window (this also sets isMinimized: false again, but is fine)
      activateWindow(id);
  }, [activateWindow]);

  const maximizeWindow = useCallback(
    (id: string) => {
      setWindows((prev) => {
        return prev.map((window) => {
          if (window.id === id) {
            return {
              ...window,
              isMinimized: false,
              minimizeAnimation: undefined,
              thumbnail: null, // Clear thumbnail on maximize as well
            }
          }
          return window
        })
      })
      activateWindow(id)
    },
    [activateWindow],
  ) // Add activateWindow to the dependency array

  const toggleMaximize = useCallback((id: string) => {
    setWindows((prev) => {
      return prev.map((window) => {
        if (window.id === id) {
          if (window.isMaximized) {
            // Restore to previous position
            return {
              ...window,
              isMaximized: false,
              position: window.previousPosition || window.position,
              previousPosition: undefined,
            }
          } else {
            // Calculate maximized position (leave some space for the menu bar)
            const maxPosition = {
              x: 0,
              y: 24, // Height of the menu bar
              width: (globalThis.window?.innerWidth ?? 1200),
              height: (globalThis.window?.innerHeight ?? 800) - 24 - 60, // Subtract menu bar and dock height
            }

            return {
              ...window,
              isMaximized: true,
              previousPosition: { ...window.position }, // Store current position
              position: maxPosition,
            }
          }
        }
        return window
      })
    })
  }, [])

  const updateWindowPosition = useCallback((id: string, position: Partial<WindowPosition>) => {
    setWindows((prev) => {
      return prev.map((window) => {
        if (window.id === id) {
          return {
            ...window,
            position: { ...window.position, ...position },
          }
        }
        return window
      })
    })
  }, [])

  const updateWindowSize = useCallback((id: string, size: { width: number; height: number }) => {
    setWindows((prev) => {
      return prev.map((window) => {
        if (window.id === id) {
          return {
            ...window,
            position: {
              ...window.position,
              width: Math.max(200, size.width), // Minimum width
              height: Math.max(100, size.height), // Minimum height
            },
          }
        }
        return window
      })
    })
  }, [])

  const getWindowById = useCallback(
    (id: string) => {
      return windows.find((window) => window.id === id)
    },
    [windows],
  )

  const contextValue = {
    windows,
    activeWindowId,
    highestZIndex,
    openWindow,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    maximizeWindow,
    toggleMaximize,
    activateWindow,
    updateWindowPosition,
    updateWindowSize,
    getWindowById,
    clearMinimizeAnimation,
  }

  return <WindowContext.Provider value={contextValue}>{children}</WindowContext.Provider>
}

export function useWindow() {
  const context = useContext(WindowContext)
  if (context === undefined) {
    throw new Error("useWindow must be used within a WindowProvider")
  }
  return context
}
