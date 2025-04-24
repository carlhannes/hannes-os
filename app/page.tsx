"use client"

import { useEffect, useState } from "react"
import Desktop from "@/components/desktop"
import Dock from "@/components/dock"
import MenuBar from "@/components/menu-bar"
import Window from "@/components/window"
import { WindowProvider, useWindow } from "@/components/window-context"
import { ContextMenuProvider } from "@/components/context-menu-provider"
import { AppProvider } from "@/components/app-context"
import { FileSystemProvider } from "@/lib/file-system/file-system-context"
import { DialogProvider } from "@/components/dialogs/dialog-context"
import { SettingsProvider } from "@/lib/settings/settings-context"

// Add global type for minimize function
declare global {
  interface Window {
    handleMinimizeToApp?: (windowId: string, appId: string) => void
  }
}

// Separate component to access window context
function AppContent() {
  const { windows } = useWindow();

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-jaguar-blue select-none">
      <MenuBar />
      <Desktop />
      {/* Render windows as siblings to Desktop, inside ContextMenuProvider */}
      {windows.map((window) => (
        <Window
          key={window.id}
          id={window.id}
          title={window.title}
          subtitle={window.subtitle}
          icon={window.icon}
          position={window.position}
          isActive={window.isActive}
          isMinimized={window.isMinimized}
          isMaximized={window.isMaximized}
          zIndex={window.zIndex}
          component={window.component}
          props={window.props}
          minimizeAnimation={window.minimizeAnimation}
        />
      ))}
      <Dock />
    </div>
  );
}

export default function Home() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(true)
  }, [])

  if (!loaded) {
    return null
  }

  // Providers wrap the component that needs their context
  return (
    <FileSystemProvider>
      <AppProvider>
        <SettingsProvider>
          <DialogProvider>
            <WindowProvider>
              <ContextMenuProvider>
                <AppContent /> 
              </ContextMenuProvider>
            </WindowProvider>
          </DialogProvider>
        </SettingsProvider>
      </AppProvider>
    </FileSystemProvider>
  )
}
