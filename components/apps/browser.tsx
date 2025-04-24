"use client"

import type React from "react"

import { useState } from "react"
import { ArrowLeft, ArrowRight, RefreshCw, Home } from "lucide-react"

interface BrowserProps {
  initialUrl?: string
}

export default function Browser({ initialUrl = "https://www.apple.com" }: BrowserProps) {
  const [url, setUrl] = useState(initialUrl)
  const [isLoading, setIsLoading] = useState(false)

  const handleNavigate = (newUrl: string) => {
    if (!newUrl.startsWith("http")) {
      newUrl = `https://${newUrl}`
    }
    setUrl(newUrl)

    // Simulate loading
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNavigate(e.currentTarget.value)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="h-10 bg-gradient-to-b from-gray-200 to-gray-100 border-b border-gray-300 flex items-center px-2 space-x-2">
        <button
          className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400 flex items-center justify-center"
          onClick={() => console.log("Back")}
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <button
          className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400 flex items-center justify-center"
          onClick={() => console.log("Forward")}
        >
          <ArrowRight className="w-4 h-4 text-gray-600" />
        </button>
        <button
          className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400 flex items-center justify-center"
          onClick={() => handleNavigate(url)}
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
        <button
          className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400 flex items-center justify-center"
          onClick={() => handleNavigate("https://www.apple.com")}
        >
          <Home className="w-4 h-4 text-gray-600" />
        </button>

        <input
          type="text"
          className="flex-1 h-6 bg-white rounded border border-gray-400 px-2 text-sm"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Browser content */}
      <div className="flex-1 bg-white overflow-hidden relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <iframe
            src={url}
            className="w-full h-full border-none"
            sandbox="allow-same-origin allow-scripts"
            title="Browser"
          />
        )}
      </div>
    </div>
  )
}
