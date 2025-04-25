"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { FolderOpen, FileText, Globe, type LucideIcon, Settings } from "lucide-react"
import path from 'path-browserify'; // Ensure path is imported

export type AppInfo = {
  id: string
  name: string
  icon: React.ReactNode
  component: string
  defaultSize: { width: number; height: number }
  defaultProps?: Record<string, any>
}

type AppContextType = {
  apps: AppInfo[]
  registerApp: (app: AppInfo) => void
  getAppById: (id: string) => AppInfo | undefined
  getAppsForExtension: (filename: string) => AppInfo[]
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const DEFAULT_APPS: AppInfo[] = [
  {
    id: "filemanager",
    name: "File Manager",
    icon: <FolderOpen className="w-full h-full text-blue-500" />,
    component: "FileManager",
    defaultSize: { width: 700, height: 500 },
    defaultProps: { initialPath: "/" },
  },
  {
    id: "textedit",
    name: "TextEdit",
    icon: <FileText className="w-full h-full text-gray-700" />,
    component: "Notepad",
    defaultSize: { width: 500, height: 400 },
  },
  {
    id: "browser",
    name: "Browser",
    icon: <Globe className="w-full h-full text-blue-600" />,
    component: "Browser",
    defaultSize: { width: 800, height: 600 },
    defaultProps: { initialUrl: "https://www.example.com" },
  },
  {
    id: "systempreferences",
    name: "System Preferences",
    icon: <Settings className="w-full h-full text-gray-600" />,
    component: "SystemPreferences",
    defaultSize: { width: 650, height: 450 },
    defaultProps: {},
  },
]

// --- Helper: Define which apps handle which extensions ---
// TODO: Later, this could come from app registration or settings
const EXTENSION_TO_APP_MAP: { [key: string]: string[] } = {
    '.txt': ['textedit'],
    '.md': ['textedit'],
    '.html': ['browser', 'textedit'], // Can be opened by browser or editor
    '.htm': ['browser', 'textedit'],
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [apps, setApps] = useState<AppInfo[]>(DEFAULT_APPS)

  const registerApp = useCallback((app: AppInfo) => {
    setApps((prev) => {
      // Don't add if app with same id already exists
      if (prev.some((a) => a.id === app.id)) {
        return prev
      }
      return [...prev, app]
    })
  }, [])

  const getAppById = useCallback(
    (id: string) => {
      return apps.find((app) => app.id === id)
    },
    [apps],
  )

  // --- New Function: Get apps that can handle an extension ---
  const getAppsForExtension = (filename: string): AppInfo[] => {
    const extension = path.extname(filename).toLowerCase();
    const appIds = EXTENSION_TO_APP_MAP[extension] || []; // Get registered apps or empty array
    
    const applicableApps = appIds
        .map(id => getAppById(id))
        .filter((app): app is AppInfo => app !== undefined); // Filter out undefined results

    return applicableApps;
  };

  const contextValue = {
    apps,
    registerApp,
    getAppById,
    getAppsForExtension, // Expose the new function
  }

  return (
    <AppContext.Provider
      value={contextValue}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
