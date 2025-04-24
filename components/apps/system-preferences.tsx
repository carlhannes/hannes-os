"use client";

import React, { useState } from 'react';
import { useSettings } from '@/lib/settings/settings-context';
import { Monitor, DockIcon, Settings as SettingsIcon, Palette, ArrowLeft } from 'lucide-react'; // Example icons and ArrowLeft

// Import the settings panes
import DesktopSettingsPane from './system-preferences/desktop-settings-pane';
import DockSettingsPane from './system-preferences/dock-settings-pane';
import GeneralSettingsPane from './system-preferences/general-settings-pane';

// Helper component for each preference item
interface PrefItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const PrefItem: React.FC<PrefItemProps> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors w-24 h-24 text-center"
  >
    <div className="w-10 h-10 mb-1 text-gray-700">{icon}</div>
    <span className="text-xs text-gray-800 font-medium">{label}</span>
  </button>
);

// Helper component for category sections
interface PrefSectionProps {
    title: string;
    children: React.ReactNode;
}

const PrefSection: React.FC<PrefSectionProps> = ({ title, children }) => (
    <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-600 px-4 pb-1 border-b border-gray-300 mb-2">
            {title}
        </h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-x-4 gap-y-2 px-4">
            {children}
        </div>
    </div>
);


export default function SystemPreferences() {
  const { settings, updateSetting, isLoading } = useSettings();
  const [currentPane, setCurrentPane] = useState<string | null>(null);

  const handleShowAll = () => {
      setCurrentPane(null); // Set to null to show the main grid
  }

  const handleDesktopClick = () => {
      setCurrentPane('desktop');
  }

  const handleDockClick = () => {
      setCurrentPane('dock');
  }

  const handleGeneralClick = () => {
      setCurrentPane('general');
  }

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-500">Loading settings...</span>
        </div>
    )
  }

  // Conditionally render the selected pane or the main grid
  const renderCurrentView = () => {
    switch (currentPane) {
        case 'desktop':
            return <DesktopSettingsPane />;
        case 'dock':
            return <DockSettingsPane />;
        case 'general':
            return <GeneralSettingsPane />;
        default:
            // --- Main Grid View ---
            return (
                <div className="p-4 pt-2">
                     <PrefSection title="Personal">
                        <PrefItem 
                            icon={<Palette className="w-full h-full" />} 
                            label="Desktop" 
                            onClick={handleDesktopClick}
                        />
                        <PrefItem 
                            icon={<DockIcon className="w-full h-full" />} 
                            label="Dock" 
                            onClick={handleDockClick}
                        />
                        <PrefItem 
                            icon={<SettingsIcon className="w-full h-full" />} 
                            label="General" 
                            onClick={handleGeneralClick}
                        />
                    </PrefSection>
                    {/* Add other sections here */}
                </div>
            );
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-200 to-gray-100">
      {/* Optional Toolbar - Show back button when a pane is active */}
      {currentPane && (
          <div className="h-10 px-2 flex items-center border-b border-gray-300 flex-shrink-0">
            <button 
                onClick={handleShowAll}
                className="p-1 rounded hover:bg-black/10"
            >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <span className="ml-2 font-medium text-sm text-gray-800 capitalize">{currentPane} Settings</span>
          </div>
      )}
      
      {/* Render the current view (either grid or specific pane) */}
      <div className="flex-1 overflow-y-auto">
        {renderCurrentView()}
      </div>
    </div>
  );
} 