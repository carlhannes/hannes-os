"use client";

import React from 'react';
import { useSettings } from '@/lib/settings/settings-context';

export default function DockSettingsPane() {
  const { settings, updateSetting } = useSettings();

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Dock Settings</h2>
      
      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input 
            type="checkbox" 
            checked={settings.dock.magnification}
            onChange={(e) => updateSetting('dock', 'magnification', e.target.checked)}
            className="form-checkbox h-4 w-4 text-blue-600"
          />
          <span className="text-sm">Enable Magnification</span>
        </label>

        <label className="flex items-center space-x-2">
          <input 
            type="checkbox" 
            checked={settings.dock.autoHide}
            onChange={(e) => updateSetting('dock', 'autoHide', e.target.checked)}
             className="form-checkbox h-4 w-4 text-blue-600"
          />
          <span className="text-sm">Automatically hide and show the Dock</span>
        </label>

         <label className="flex items-center space-x-2">
            <span className="text-sm w-28">Magnification:</span>
             <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.1" 
                value={settings.dock.magnificationScale}
                onChange={(e) => updateSetting('dock', 'magnificationScale', parseFloat(e.target.value))}
                disabled={!settings.dock.magnification} // Disable if magnification is off
                className="w-48 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
             />
             <span className="text-xs text-gray-600 w-8 text-right">{settings.dock.magnificationScale.toFixed(1)}x</span>
         </label>

      </div>

    </div>
  );
} 