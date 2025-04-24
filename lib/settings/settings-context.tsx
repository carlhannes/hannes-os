"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// 1. Define the structure of your settings
export interface SettingsState {
  desktop: {
    wallpaper: string; // Example: path or URL to image
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
    wallpaper: '/img/wallpapers/jaguar-default.jpg', // Default wallpaper path
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
interface SettingsContextType {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState, SK extends keyof SettingsState[K]>(category: K, key: SK, value: SettingsState[K][SK]) => void;
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
        setSettings(prev => ({ ...DEFAULT_SETTINGS, ...parsedSettings }));
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
  const updateSetting = useCallback(<K extends keyof SettingsState, SK extends keyof SettingsState[K]>(
    category: K,
    key: SK,
    value: SettingsState[K][SK]
  ) => {
    setSettings((prevSettings) => {
      const newCategoryState = { ...prevSettings[category], [key]: value };
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