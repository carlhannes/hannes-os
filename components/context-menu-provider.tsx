"use client"

import type React from "react"

import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"

export type MenuItem = {
  label: string
  action?: () => void
  submenu?: MenuItem[]
  separator?: false
} | {
  separator: true
  label?: never
  action?: never
  submenu?: never
}

type ContextMenuType = {
  showContextMenu: (e: React.MouseEvent, items: MenuItem[]) => void
  hideContextMenu: () => void
}

const ContextMenuContext = createContext<ContextMenuType | undefined>(undefined)

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const showContextMenu = (e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault()

    // Calculate position, ensuring menu stays within viewport
    const x = Math.min(e.clientX, window.innerWidth - 200)
    const y = Math.min(e.clientY, window.innerHeight - 100)

    setPosition({ x, y })
    setMenuItems(items)
    setIsVisible(true)
  }

  const hideContextMenu = () => {
    setIsVisible(false)
    setActiveSubmenu(null)
  }

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu()
      }
    }

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isVisible])

  return (
    <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu }}>
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={menuRef}
            className="fixed z-[1000] bg-white rounded-md shadow-lg border border-gray-200 py-1 w-48"
            style={{ left: position.x, top: position.y }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
          >
            {menuItems.map((item, index) => {
              if (item.separator === true) {
                return <div key={index} className="h-px bg-gray-200 my-1 mx-2" />
              }

              return (
                <div
                  key={index}
                  className="px-3 py-1 text-sm text-gray-800 hover:bg-blue-500 hover:text-white cursor-default flex items-center justify-between relative"
                  onClick={() => {
                    if (item.action) {
                      item.action()
                      hideContextMenu()
                    }
                  }}
                  onMouseEnter={() => {
                    if (item.submenu) {
                      setActiveSubmenu(item.label)
                    } else {
                      setActiveSubmenu(null)
                    }
                  }}
                >
                  {item.label}
                  {item.submenu && (
                    <>
                      <span>▶</span>
                      {activeSubmenu === item.label && (
                        <div className="absolute left-full top-0 bg-white rounded-md shadow-lg border border-gray-200 py-1 w-48 -mt-1 ml-0.5">
                          {item.submenu.map((subItem, subIndex) => (
                            <div
                              key={subIndex}
                              className="px-3 py-1 text-sm text-gray-800 hover:bg-blue-500 hover:text-white cursor-default"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (subItem.action) {
                                  subItem.action()
                                  hideContextMenu()
                                }
                              }}
                            >
                              {subItem.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </ContextMenuContext.Provider>
  )
}

export function useContextMenu() {
  const context = useContext(ContextMenuContext)
  if (context === undefined) {
    throw new Error("useContextMenu must be used within a ContextMenuProvider")
  }
  return context
}
