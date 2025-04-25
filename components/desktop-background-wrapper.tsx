"use client";

import React from 'react';
import { useSettings } from '@/lib/settings/settings-context';
import WaveAnimation from './background-animations/WaveAnimation';
import ParticlesAnimation from './background-animations/ParticlesAnimation';
import ParticleGlobe from './background-animations/ParticleGlobe';

const DesktopBackgroundWrapper: React.FC = () => {
  const { settings, isLoading } = useSettings();

  // Don't render anything until settings are loaded to avoid flash of default
  if (isLoading) {
    return null; 
  }

  const backgroundSetting = settings.desktop.background;

  const renderBackground = () => {
    switch (backgroundSetting.type) {
      case 'color':
        return (
          <div
            className="absolute inset-0 -z-10"
            style={{ backgroundColor: backgroundSetting.color }}
          />
        );
      case 'image':
        return (
          <div
            className="absolute inset-0 -z-10 bg-no-repeat"
            style={{
              backgroundImage: `url(${JSON.stringify(backgroundSetting.url)})`, // Use JSON.stringify for safety
              backgroundSize: backgroundSetting.fit, // 'cover', 'contain', 'fill'
              backgroundPosition: 'center center',
              filter: backgroundSetting.filter ?? 'none', // Apply CSS filter or 'none'
            }}
          />
        );
      case 'animation':
        switch (backgroundSetting.animationId) {
          case 'wave':
            return <WaveAnimation />;
          case 'particles':
            return <ParticlesAnimation />;
          case 'globe':
            return <ParticleGlobe />;
          default:
            // Fallback for unknown animation ID - render default color
            console.warn(`Unknown animationId: ${backgroundSetting.animationId}`);
            return <div className="absolute inset-0 -z-10" style={{ backgroundColor: '#0d94e4' }} />;
        }
      default:
        // Fallback for unknown type - render default color
         return <div className="absolute inset-0 -z-10" style={{ backgroundColor: '#0d94e4' }} />;
    }
  };

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {renderBackground()}
    </div>
  );
};

export default DesktopBackgroundWrapper; 