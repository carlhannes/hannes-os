"use client";

import React from 'react';
import { useSettings } from '@/lib/settings/settings-context';

export default function GeneralSettingsPane() {
  const { settings, updateSetting } = useSettings();

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">General Settings</h2>
      
      <div className="space-y-2">
        <fieldset>
            <legend className="text-sm font-medium mb-1">Click behavior for items:</legend>
            <div className="flex items-center space-x-4 pl-2">
                 <label className="flex items-center space-x-1">
                    <input 
                        type="radio" 
                        name="clickBehavior" 
                        value="single"
                        checked={settings.general.clickBehavior === 'single'}
                        onChange={(e) => updateSetting('general', 'clickBehavior', e.target.value as 'single' | 'double')}
                        className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Single-click to open</span>
                </label>
                 <label className="flex items-center space-x-1">
                    <input 
                        type="radio" 
                        name="clickBehavior" 
                        value="double"
                        checked={settings.general.clickBehavior === 'double'}
                        onChange={(e) => updateSetting('general', 'clickBehavior', e.target.value as 'single' | 'double')}
                        className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Double-click to open</span>
                </label>
            </div>
        </fieldset>

        {/* Add more general settings here */}

      </div>
    </div>
  );
} 