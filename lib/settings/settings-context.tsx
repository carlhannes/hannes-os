"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// 1. Define the structure of your settings

// Define the new discriminated union for desktop background settings
export type DesktopBackgroundSetting =
  | { type: 'color'; color: string } // e.g., '#RRGGBB' or 'rgba(...)'
  | { type: 'image'; url: string; fit: 'cover' | 'contain' | 'fill'; filter: string | null } // filter: CSS filter value like 'grayscale(100%)' or 'sepia(80%)'
  | { type: 'animation'; animationId: 'wave' | 'particles' | 'globe' }; // Add 'globe'

export interface SettingsState {
  desktop: {
    // wallpaper: string; // Remove or deprecate old setting - Replaced by background object
    background: DesktopBackgroundSetting;
  };
  dock: {
    autoHide: boolean;
    magnification: boolean;
    magnificationScale: number; // e.g., 1.5
  };
  general: {
    clickBehavior: 'single' | 'double'; // Example setting
    // Add other general settings here
  };
  // Add more top-level categories as needed
}

// 2. Define default settings
const DEFAULT_SETTINGS: SettingsState = {
  desktop: {
    // Default to the globe animation
    background: { type: 'animation', animationId: 'globe' }, 
    // background: { type: 'color', color: '#0d94e4' }, // Old default
  },
  dock: {
    autoHide: false,
    magnification: true,
    magnificationScale: 2,
  },
  general: {
    clickBehavior: 'double',
  },
};

// 3. Define the context type
// Ensure updateSetting type works with the nested background object
interface SettingsContextType {
  settings: SettingsState;
  // This type needs to handle nested updates correctly.
  // A simpler approach might be to always update the entire 'background' object.
  // updateSetting: <K extends keyof SettingsState, SK extends keyof SettingsState[K]>(category: K, key: SK, value: SettingsState[K][SK]) => void;
  updateSetting: <K extends keyof SettingsState>(category: K, key: keyof SettingsState[K], value: SettingsState[K][keyof SettingsState[K]]) => void;
  resetSettings: () => void;
  isLoading: boolean; // Indicate if settings are being loaded
}

// 4. Create the context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// 5. Create the provider component
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const storageKey = 'desktop-settings';

  // Load settings from localStorage on mount
  useEffect(() => {
    setIsLoading(true);
    try {
      const storedSettings = localStorage.getItem(storageKey);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        // Basic validation/merge with defaults to handle missing keys after updates
        // Deep merge might be needed if structure changes significantly, but for now this should merge top-level keys
        // and overwrite nested objects like 'desktop' entirely if present in storage.
        // Let's refine the merge to be slightly safer for nested objects:
        const mergedSettings: SettingsState = {
            ...DEFAULT_SETTINGS,
            ...parsedSettings,
            // Ensure nested objects also have defaults if missing from storage
            desktop: { ...DEFAULT_SETTINGS.desktop, ...(parsedSettings.desktop || {}) },
            dock: { ...DEFAULT_SETTINGS.dock, ...(parsedSettings.dock || {}) },
            general: { ...DEFAULT_SETTINGS.general, ...(parsedSettings.general || {}) },
        };
        setSettings(mergedSettings);
      } else {
        // No stored settings, use defaults
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
      setSettings(DEFAULT_SETTINGS); // Fallback to defaults on error
    } finally {
        setIsLoading(false);
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    // Don't save during initial load or if settings haven't changed from default placeholder
    if (!isLoading) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(settings));
        } catch (error) {
            console.error("Failed to save settings to localStorage:", error);
        }
    }
  }, [settings, isLoading]);

  // Function to update a specific setting
  // Refined updateSetting to handle nested structures more explicitly if needed,
  // but updating the whole 'background' object is often simpler.
  const updateSetting = useCallback(<K extends keyof SettingsState>(
    category: K,
    key: keyof SettingsState[K],
    value: SettingsState[K][keyof SettingsState[K]]
  ) => {
    setSettings((prevSettings) => {
      // Create a new object for the category being updated
      const newCategoryState = { ...prevSettings[category], [key]: value };
      // Return the new top-level state object
      return { ...prevSettings, [category]: newCategoryState };
    });
  }, []);

  // Function to reset settings to default
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    // No need to explicitly remove from localStorage here,
    // the useEffect saving hook will overwrite it with defaults.
  }, []);

  const contextValue = {
    settings,
    updateSetting,
    resetSettings,
    isLoading,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

// 6. Create the custom hook
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
} 