"use client";

import React from 'react';
import { useSettings } from '@/lib/settings/settings-context';

export default function DesktopSettingsPane() {
  const { settings, updateSetting } = useSettings();

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Desktop Settings</h2>
      <p className="text-sm text-gray-600 mb-2">Current Wallpaper: {settings.desktop.wallpaper}</p>
      {/* TODO: Add controls to change wallpaper */}
      <input 
        type="text" 
        placeholder="Enter wallpaper path/URL" 
        // value={settings.desktop.wallpaper} // Control this later
        // onChange={(e) => updateSetting('desktop', 'wallpaper', e.target.value)}
        className="mt-2 p-1 border rounded w-full text-sm"
        disabled // Disabled for now
      />
      <p className="text-xs text-gray-500 mt-1">Implement file picker or URL input later.</p>
    </div>
  );
} 