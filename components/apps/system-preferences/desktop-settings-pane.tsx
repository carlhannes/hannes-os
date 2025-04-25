"use client";

import React, { useState, useMemo } from 'react';
import { useSettings, type DesktopBackgroundSetting } from '@/lib/settings/settings-context';
import { Palette, Image as ImageIcon, Film, Check } from 'lucide-react';

// --- Helper Components ---

interface TabButtonProps {
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${isActive
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200/70'
            }`}
    >
        {icon}
        <span className="ml-1.5">{label}</span>
    </button>
);

interface ColorSwatchProps {
    color: string;
    isSelected: boolean;
    onClick: () => void;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ color, isSelected, onClick }) => (
    <button
        onClick={onClick}
        className={`w-8 h-8 rounded-full border border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 relative flex items-center justify-center ${isSelected ? 'ring-2 ring-blue-600 ring-offset-1' : ''}`}
        style={{ backgroundColor: color }}
        title={color}
    >
        {isSelected && <Check size={16} className="text-white mix-blend-difference" />}
    </button>
);

// --- Main Component ---

const PRESET_COLORS = ['#0d94e4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#64748b'];
const IMAGE_FIT_OPTIONS = [
    { label: 'Cover', value: 'cover' },
    { label: 'Contain', value: 'contain' },
    { label: 'Fill', value: 'fill' },
];
const IMAGE_FILTER_OPTIONS = [
    { label: 'None', value: null },
    { label: 'Grayscale', value: 'grayscale(100%)' },
    { label: 'Sepia', value: 'sepia(80%)' },
    { label: 'Blur (5px)', value: 'blur(5px)' },
    { label: 'Invert', value: 'invert(100%)' },
];
const ANIMATION_OPTIONS = [
    { label: 'Waves', id: 'wave' },
    { label: 'Particles', id: 'particles' },
    { label: 'Globe', id: 'globe' },
];

export default function DesktopSettingsPane() {
  const { settings, updateSetting, isLoading } = useSettings();
  const currentBackground = settings.desktop.background;

  // Determine active tab based on current setting type
  const activeTab = useMemo(() => currentBackground.type, [currentBackground.type]);

  // Handler for setting the entire background object
  const handleBackgroundChange = (newBgSetting: DesktopBackgroundSetting) => {
      updateSetting('desktop', 'background', newBgSetting);
  };

  // Specific change handlers
  const handleColorSelect = (color: string) => {
      handleBackgroundChange({ type: 'color', color });
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (currentBackground.type === 'image') {
          handleBackgroundChange({ ...currentBackground, url: e.target.value });
      }
  };

  const handleImageFitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (currentBackground.type === 'image') {
          handleBackgroundChange({ ...currentBackground, fit: e.target.value as 'cover' | 'contain' | 'fill' });
      }
  };

  const handleImageFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (currentBackground.type === 'image') {
          const filterValue = e.target.value === "null" ? null : e.target.value;
          handleBackgroundChange({ ...currentBackground, filter: filterValue });
      }
  };

  const handleAnimationSelect = (animationId: 'wave' | 'particles' | 'globe') => {
      handleBackgroundChange({ type: 'animation', animationId });
  };

  if (isLoading) {
    // Optional: Add a loading indicator if settings take time
    return <div className="p-4 text-center text-gray-500">Loading Desktop Settings...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-semibold mb-1">Desktop Background</h2>
      
      {/* Tab Selector */}
      <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg">
          <TabButton 
              label="Color" 
              icon={<Palette size={16}/>} 
              isActive={activeTab === 'color'} 
              onClick={() => handleBackgroundChange({ type: 'color', color: currentBackground.type === 'color' ? currentBackground.color : PRESET_COLORS[0] })} // Switch to color, keeping current or using default
          />
          <TabButton 
              label="Image" 
              icon={<ImageIcon size={16}/>} 
              isActive={activeTab === 'image'} 
              onClick={() => handleBackgroundChange({ type: 'image', url: '', fit: 'cover', filter: null })} // Switch to image with defaults
          />
          <TabButton 
              label="Animation" 
              icon={<Film size={16}/>} 
              isActive={activeTab === 'animation'} 
              onClick={() => handleBackgroundChange({ type: 'animation', animationId: 'wave' })} // Switch to animation with default
          />
      </div>

      {/* Content based on active tab */}
      <div>
        {activeTab === 'color' && (
            <div className="space-y-4">
                <p className="text-sm text-gray-600">Choose a solid color background.</p>
                <div className="flex flex-wrap gap-3">
                    {PRESET_COLORS.map(color => (
                        <ColorSwatch 
                            key={color} 
                            color={color} 
                            isSelected={currentBackground.type === 'color' && currentBackground.color === color}
                            onClick={() => handleColorSelect(color)}
                        />
                    ))}
                </div>
                 <div>
                     <label htmlFor="customColor" className="text-sm font-medium text-gray-700 mr-2">Custom Color:</label>
                     <input 
                        type="color" 
                        id="customColor"
                        value={currentBackground.type === 'color' ? currentBackground.color : '#ffffff'} // Default input value if not color type
                        onChange={(e) => handleColorSelect(e.target.value)}
                        className="w-10 h-8 p-0 border-none rounded cursor-pointer align-middle focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                    />
                </div>
            </div>
        )}

        {activeTab === 'image' && currentBackground.type === 'image' && (
            <div className="space-y-4">
                <p className="text-sm text-gray-600">Set an image URL as the background.</p>
                <div>
                    <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">Image URL:</label>
                    <input 
                        type="text" 
                        id="imageUrl" 
                        placeholder="https://example.com/image.jpg" 
                        value={currentBackground.url}
                        onChange={handleImageUrlChange}
                        className="w-full p-1.5 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="imageFit" className="block text-sm font-medium text-gray-700 mb-1">Fit:</label>
                        <select 
                            id="imageFit" 
                            value={currentBackground.fit}
                            onChange={handleImageFitChange}
                             className="w-full p-1.5 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                           {IMAGE_FIT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                           ))}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="imageFilter" className="block text-sm font-medium text-gray-700 mb-1">Effect:</label>
                        <select 
                            id="imageFilter" 
                            value={currentBackground.filter ?? 'null'} // Use 'null' string for the select value
                            onChange={handleImageFilterChange}
                             className="w-full p-1.5 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            {IMAGE_FILTER_OPTIONS.map(opt => (
                                <option key={opt.label} value={opt.value ?? 'null'}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'animation' && currentBackground.type === 'animation' && (
             <div className="space-y-3">
                <p className="text-sm text-gray-600">Choose an animated background.</p>
                 <fieldset>
                    <legend className="sr-only">Select Animation</legend>
                    <div className="space-y-2">
                    {ANIMATION_OPTIONS.map(opt => (
                        <label key={opt.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                            <input 
                                type="radio" 
                                name="animationSelection"
                                value={opt.id}
                                checked={currentBackground.animationId === opt.id}
                                onChange={() => handleAnimationSelect(opt.id as 'wave' | 'particles' | 'globe')}
                                className="form-radio h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                        </label>
                    ))}
                    </div>
                 </fieldset>
             </div>
        )}
      </div>

    </div>
  );
} 