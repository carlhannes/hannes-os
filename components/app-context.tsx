"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { FolderOpen, FileText, Globe, type LucideIcon, Settings, Image, TerminalSquare, Camera } from "lucide-react"
import path from 'path-browserify'; // Ensure path is imported
// import { IconComponent, type AppInfo } from "@/lib/types" // Removed incorrect import

// Type for App Information (defined locally)
export type AppInfo = {
  id: string;
  name: string;
  icon: React.ReactElement<LucideIcon> | React.ReactElement; // Allow custom icon components too
  component: string; // Component name string used in Window switch case
  defaultSize?: { width: number; height: number };
  defaultProps?: Record<string, any>; // Optional props to pass to the component
};

// Simple component placeholder for Finder icon - adjust path if needed
const IconComponent = ({ iconPath }: { iconPath: string }) => (
  <img src={iconPath} alt="icon" className="w-full h-full" />
);

export const DEFAULT_APPS: AppInfo[] = [
  {
    id: "notepad",
    name: "TextEdit",
    icon: <FileText className="w-full h-full text-gray-600" />,
    component: "Notepad",
    defaultSize: { width: 600, height: 400 },
  },
  {
    id: "browser",
    name: "Browser",
    icon: <Globe className="w-full h-full text-blue-500" />,
    component: "Browser",
    defaultSize: { width: 800, height: 600 },
  },
  {
    id: "filemanager",
    name: "File Manager",
    icon: <FolderOpen className="w-full h-full text-blue-500" />,
    component: "FileManager",
    defaultSize: { width: 700, height: 500 },
  },
  {
    id: "systempreferences",
    name: "System Preferences",
    icon: <Settings className="w-full h-full text-gray-600" />,
    component: "SystemPreferences",
    defaultSize: { width: 650, height: 450 },
  },
  {
    id: "imageviewer",
    name: "Image Viewer",
    icon: <Image className="w-full h-full text-purple-500" />,
    component: "ImageViewer",
    defaultSize: { width: 600, height: 500 },
  },
  // Add PhotoBooth <-- RESTORING
  {
    id: "photobooth",
    name: "Photo Booth",
    icon: <Camera className="w-full h-full text-red-500" />,
    component: "PhotoBooth",
    defaultSize: { width: 640, height: 480 },
  },
]

// Mapping from file extensions to default application IDs
const EXTENSION_TO_APP_MAP: Record<string, string> = {
  ".txt": "notepad",
  ".md": "notepad",
  ".js": "notepad",
  ".ts": "notepad",
  ".css": "notepad",
  ".json": "notepad", // Added json
  ".xml": "notepad", // Added xml
  ".html": "browser",
  ".htm": "browser",
  ".png": "imageviewer",
  ".jpg": "imageviewer",
  ".jpeg": "imageviewer",
  ".gif": "imageviewer",
  ".webp": "imageviewer",
  ".bmp": "imageviewer",
  ".ico": "imageviewer",
}

// Helper function to get applicable app IDs for a given file name
export const getAppsForExtension = (fileName: string): AppInfo[] => {
  const ext = path.extname(fileName).toLowerCase();
  const defaultAppId = EXTENSION_TO_APP_MAP[ext];
  const results: AppInfo[] = [];

  // Find the default app info
  const defaultApp = DEFAULT_APPS.find(app => app.id === defaultAppId);
  if (defaultApp) {
    results.push(defaultApp);
  }

  // Add other potential handlers (e.g., TextEdit for many types)
  // This logic determines the "Open With..." options
  const textEditApp = DEFAULT_APPS.find(app => app.id === 'notepad');
  if (textEditApp && defaultAppId !== 'notepad') { 
    // Add TextEdit if it's not the default and the file isn't an image/special type
    const isPotentiallyText = !".png .jpg .jpeg .gif .webp .bmp .ico".includes(ext);
    if (isPotentiallyText) {
       results.push(textEditApp);
    }
  }
  
  // Add Browser as an option for HTML files if it wasn't the default
  const browserApp = DEFAULT_APPS.find(app => app.id === 'browser');
  if (browserApp && defaultAppId !== 'browser' && (ext === '.html' || ext === '.htm')) {
    results.push(browserApp);
  }

  // Ensure unique apps if multiple paths added the same one (though unlikely with current logic)
  // Simple filter based on id
  const uniqueResults = results.filter((app, index, self) => 
     index === self.findIndex((a) => a.id === app.id)
  );
  
  console.log(`[getAppsForExtension] Apps for "${fileName}" (ext: ${ext}):`, uniqueResults.map(a => a.id));

  return uniqueResults;
};

// --- App Context Definition ---

type AppContextType = {
  apps: AppInfo[];
  getAppById: (id: string) => AppInfo | undefined;
  // Reference the standalone helper function type
  getAppsForExtension: (fileName: string) => AppInfo[]; 
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Keep registered apps in state if we want dynamic registration later
  const [apps, setApps] = useState<AppInfo[]>(DEFAULT_APPS);

  // Function to get app info by ID (memoized)
  const getAppById = useCallback(
    (id: string): AppInfo | undefined => {
      return apps.find((app) => app.id === id);
    },
    [apps],
  );

  // --- Context Value ---
  // Make sure the provided value includes the standalone getAppsForExtension
  const contextValue: AppContextType = {
    apps,
    getAppById,
    getAppsForExtension, // Provide the helper function here
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

// Custom hook to use the App context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
