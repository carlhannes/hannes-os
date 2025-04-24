"use client"

import { useState, useEffect } from "react"
import { useWindow } from "@/components/window-context"
import { Apple } from "lucide-react"

export default function MenuBar() {
  const { activeWindowId, windows } = useWindow()
  const [currentTime, setCurrentTime] = useState<string>("")

  // Get the active window
  const activeWindow = windows.find((window) => window.id === activeWindowId)

  // Update the time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const ampm = hours >= 12 ? "PM" : "AM"
      const formattedHours = hours % 12 || 12
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes

      setCurrentTime(`${formattedHours}:${formattedMinutes} ${ampm}`)
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-6 bg-gradient-to-b from-gray-300 to-gray-200 border-b border-gray-400 flex items-center px-2 text-sm font-medium text-gray-800 shadow-sm z-50">
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <Apple className="w-4 h-4 mr-1" />
        </div>

        <div className="font-bold">{activeWindow ? activeWindow.title : "Finder"}</div>

        <div>File</div>
        <div>Edit</div>
        <div>View</div>
        <div>Go</div>
        <div>Window</div>
        <div>Help</div>
      </div>

      <div className="ml-auto flex items-center space-x-4">
        <div>{currentTime}</div>
      </div>
    </div>
  )
}
