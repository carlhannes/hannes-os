"use client"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Make label required unless separator is true
export type MenuItem = {
  label: string
  action?: () => void
  shortcut?: string
  disabled?: boolean
  separator?: false // Explicitly false for non-separators
} | {
  separator: true
  label?: never // Ensure label is not provided for separators
  action?: never
  shortcut?: never
  disabled?: never
}

interface DropdownMenuProps {
  label: string
  items: MenuItem[]
  isActive?: boolean
  onActivate?: () => void
}

export default function DropdownMenu({ label, items, isActive = false, onActivate }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Handle menu toggle
  const handleToggle = () => {
    if (!isOpen && onActivate) {
      onActivate()
    }
    setIsOpen(!isOpen)
  }

  // Handle menu item click
  const handleItemClick = (item: MenuItem) => {
    if (item.action && !item.disabled) {
      item.action()
    }
    setIsOpen(false)
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        className={`px-2 py-1 text-sm ${
          isActive || isOpen
            ? "bg-blue-500 text-white"
            : "text-gray-800 hover:bg-gray-200"
        } rounded`}
        onClick={handleToggle}
      >
        {label}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute left-0 top-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50 min-w-[150px]"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.1 }}
          >
            {items.map((item, index) =>
              item.separator ? (
                <div key={`sep-${index}`} className="h-px bg-gray-200 my-1 mx-2" />
              ) : (
                <button
                  key={index}
                  className={`w-full text-left px-3 py-1 text-sm ${
                    item.disabled
                      ? "text-gray-400"
                      : "text-gray-800 hover:bg-blue-500 hover:text-white"
                  } flex justify-between items-center`}
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                >
                  <span>{item.label}</span>
                  {item.shortcut && <span className="text-xs text-gray-500 ml-4">{item.shortcut}</span>}
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
