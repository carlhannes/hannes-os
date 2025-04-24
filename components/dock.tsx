"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion"
import { useWindow, type WindowState } from "@/components/window-context"
import { useApp } from "@/components/app-context"
import { useSettings } from "@/lib/settings/settings-context"

// Helper: Calculate distance between two points
const distance = (p1: number, p2: number) => Math.abs(p1 - p2);

// Helper: Map distance to scale using a curve (adjust factor for sensitivity)
const mapDistanceToScale = (dist: number, maxDist: number, baseScale: number, maxScale: number) => {
    if (dist >= maxDist) return baseScale;
    // Cosine-based falloff for smooth scaling
    const scale = baseScale + (maxScale - baseScale) * (Math.cos(dist / maxDist * Math.PI / 2));
    return scale;
};

export default function Dock() {
  const { windows, openWindow, maximizeWindow, minimizeWindow, restoreWindow } = useWindow()
  const { apps } = useApp()
  const { settings } = useSettings()

  const dockRef = useRef<HTMLDivElement>(null)

  // Motion values for magnification
  const mouseX = useMotionValue<number>(-1);
  const smoothMouseX = useSpring(mouseX, { damping: 20, stiffness: 150 });

  // State for tooltips
  const [hoveredApp, setHoveredApp] = useState<string | null>(null)
  const [hoveredMinimizedWindow, setHoveredMinimizedWindow] = useState<string | null>(null)
  const appRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({})
  const minimizedWindowRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({})

  // State for auto-hide visibility
  const [isDockVisible, setIsDockVisible] = useState(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for hide delay timer

  // State to hold the target animation values for each icon
  const [iconAnimState, setIconAnimState] = useState<Record<string, { scale: number; y: number }>>({});

  // Filter minimized windows EARLIER 
  const minimizedWindows = windows.filter((window) => window.isMinimized)

  // Ensure refs are created for all items - This runs before the first render that uses them
  apps.forEach((app) => {
    if (!appRefs.current[app.id]) {
      appRefs.current[app.id] = React.createRef();
    }
  });
  minimizedWindows.forEach((window) => {
    if(!minimizedWindowRefs.current[window.id]) {
        minimizedWindowRefs.current[window.id] = React.createRef();
    }
  });

  // --- Calculate and Update Animation State --- 
  const DOCK_ITEM_WIDTH = 48;
  const MAX_DIST = DOCK_ITEM_WIDTH * 3;

  const calculateAndUpdateState = useCallback(() => {
      const newAnimState: Record<string, { scale: number; y: number }> = {};
      const currentMouseX = mouseX.get(); // Raw mouse value
      const currentSmoothMouseX = smoothMouseX.get(); // Smoothed mouse value
      const dockRect = dockRef.current?.getBoundingClientRect();
      const magnificationEnabled = settings.dock.magnification;
      const maxScale = settings.dock.magnificationScale;

      if (!dockRect) return; // Need dock bounds

      const processItem = (id: string, ref: React.RefObject<HTMLDivElement>) => {
          let targetScale = 1;
          let targetY = 0;
          const itemRefCurrent = ref.current;

          if (itemRefCurrent && magnificationEnabled) {
                const itemRect = itemRefCurrent.getBoundingClientRect();
                const itemCenterX = itemRect.left - dockRect.left + itemRect.width / 2;
                
                // Use smooth value for distance calculation
                const dist = distance(currentSmoothMouseX, itemCenterX); 
                
                // Determine scale based on effective distance (using raw mouseX for exit check)
                const effectiveDist = (currentMouseX === -1) ? MAX_DIST : dist;
                targetScale = mapDistanceToScale(effectiveDist, MAX_DIST, 1, maxScale);
                targetY = - (DOCK_ITEM_WIDTH * (targetScale - 1) / 2);
          }
          newAnimState[id] = { scale: targetScale, y: targetY };
      };

      // Process apps
      apps.forEach(app => {
          const ref = appRefs.current[app.id];
          if (ref) processItem(app.id, ref);
      });

      // Process minimized windows
      minimizedWindows.forEach(window => {
          const ref = minimizedWindowRefs.current[window.id];
           if (ref) processItem(window.id, ref);
      });
      
      if (JSON.stringify(newAnimState) !== JSON.stringify(iconAnimState)) {
         setIconAnimState(newAnimState);
      }
  }, [mouseX, smoothMouseX, settings.dock.magnification, settings.dock.magnificationScale, apps, minimizedWindows, iconAnimState]); // Added minimizedWindows to dependency array

  // Run calculation when mouse or settings change
  useEffect(() => {
      const unsubscribeSmooth = smoothMouseX.on("change", calculateAndUpdateState);
      const unsubscribeRaw = mouseX.on("change", calculateAndUpdateState);
      calculateAndUpdateState(); // Initial calculation
      return () => {
          unsubscribeSmooth();
          unsubscribeRaw();
      };
  }, [calculateAndUpdateState, smoothMouseX, mouseX]); 

 // Re-calculate if magnification settings change
 useEffect(() => {
    calculateAndUpdateState();
 }, [settings.dock.magnification, settings.dock.magnificationScale, calculateAndUpdateState]);

  useEffect(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (!settings.dock.autoHide) {
      setIsDockVisible(true);
    } 
    return () => {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
    };
  }, [settings.dock.autoHide]);

  const handleAppClick = (appId: string) => {
    // Check if the app is already open
    const existingWindow = windows.find(
      (window) => window.component === apps.find((app) => app.id === appId)?.component,
    )

    if (existingWindow) {
      // If minimized, restore it
      if (existingWindow.isMinimized) {
        restoreWindow(existingWindow.id)
      }
      // Otherwise it's already open, so do nothing
    } else {
      // Open a new window for this app
      const app = apps.find((app) => app.id === appId)
      if (app) {
        openWindow({
          title: app.name,
          icon: app.icon,
          component: app.component,
          position: {
            x: Math.max(50, Math.random() * 100),
            y: Math.max(50, Math.random() * 100),
            width: app.defaultSize.width,
            height: app.defaultSize.height,
          },
          props: app.defaultProps,
        })
      }
    }
  }

  // Handlers for auto-hide interactions
  const handleMouseEnterDock = () => {
    if (settings.dock.autoHide) {
      if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
      }
      setIsDockVisible(true);
    }
  };

  const handleMouseLeaveDock = () => {
     if (settings.dock.autoHide) {
        // Debounce hiding
        hideTimeoutRef.current = setTimeout(() => {
            setIsDockVisible(false);
            mouseX.set(-1); // Reset mouseX when hiding
        }, 300); // Hide after 300ms delay
     }
     mouseX.set(-1); // Reset mouseX immediately on leave for magnification
  };

  return (
    // Apply animation based on isDockVisible state if autoHide is on
    <motion.div
      className="fixed bottom-0 left-0 right-0 flex justify-center pb-1 z-50" 
      animate={{
          y: settings.dock.autoHide && !isDockVisible ? 60 : 0 // Move down 60px when hidden
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onMouseEnter={handleMouseEnterDock} 
      onMouseLeave={handleMouseLeaveDock}
    >
      <motion.div
        ref={dockRef}
        className="bg-white/20 backdrop-blur-md rounded-2xl px-2 py-1 border border-white/30 shadow-lg flex items-end space-x-1"
        onMouseMove={(e) => {
            if (dockRef.current) { // Update regardless of magnification setting, variant logic handles enable/disable
                 const rect = dockRef.current.getBoundingClientRect();
                 mouseX.set(e.clientX - rect.left);
            }
        }}
      >
        {apps.map((app) => {
          const isOpen = windows.some((window) => window.component === app.component && !window.isMinimized)
          const anim = iconAnimState[app.id] || { scale: 1, y: 0 }; // Get state or default

          return (
            <motion.div
              key={app.id}
              ref={appRefs.current[app.id]} // Should now be guaranteed to exist
              className="relative group"
              onMouseEnter={() => setHoveredApp(app.id)}
              onMouseLeave={() => setHoveredApp(null)}
              // Animate using state values
              animate={anim} 
              // Define transition between state changes
              transition={{ type: "spring", stiffness: 300, damping: 20 }} 
            >
              <motion.div
                className={`w-12 h-12 relative cursor-pointer flex items-center justify-center bg-white/10 rounded-xl backdrop-blur-sm ${
                  isOpen
                    ? "after:content-[''] after:absolute after:bottom-[-8px] after:left-1/2 after:transform after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-white after:rounded-full"
                    : ""
                }`}
                onClick={() => handleAppClick(app.id)}
              >
                <div className="w-8 h-8">{app.icon}</div>
              </motion.div>

              <AnimatePresence>
                {hoveredApp === app.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: -5 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-1 whitespace-nowrap bg-black/70 text-white text-xs py-0.5 px-2 rounded pointer-events-none"
                  >
                    {app.name}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}

        {minimizedWindows.length > 0 && (
          <div className="w-px h-10 bg-white/30 mx-1 my-1 self-center" />
        )}

        {minimizedWindows.map((window) => {
            const anim = iconAnimState[window.id] || { scale: 1, y: 0 }; // Get state or default
            return (
              <motion.div
                key={window.id}
                ref={minimizedWindowRefs.current[window.id]} // Should now be guaranteed to exist
                className="relative group"
                onMouseEnter={() => setHoveredMinimizedWindow(window.id)}
                onMouseLeave={() => setHoveredMinimizedWindow(null)}
                // Animate using state values
                animate={anim}
                // Define transition between state changes
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <motion.div
                  className="w-12 h-12 relative cursor-pointer flex items-center justify-center bg-black/10 rounded-xl backdrop-blur-sm border border-white/20 p-0.5 shadow-inner overflow-hidden"
                  onClick={() => restoreWindow(window.id)}
                >
                  {window.thumbnail ? (
                      <img 
                        src={window.thumbnail} 
                        alt={`${window.title} thumbnail`} 
                        className="w-full h-full object-cover rounded-[10px]"
                      />
                  ) : (
                      <div className="w-6 h-6 opacity-80 flex items-center justify-center">
                        {typeof window.icon === 'string' 
                            ? apps.find(app => app.id === window.icon)?.icon || <div className="w-full h-full bg-gray-400 rounded"/>
                            : window.icon || <div className="w-full h-full bg-gray-400 rounded"/>
                        }
                      </div>
                  )}
                </motion.div>

                <AnimatePresence>
                  {hoveredMinimizedWindow === window.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: -5 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-1 whitespace-nowrap bg-black/70 text-white text-xs py-0.5 px-2 rounded pointer-events-none"
                    >
                      {window.title} {window.subtitle ? `- ${window.subtitle}` : ''}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
        })}
      </motion.div>
    </motion.div>
  )
}
