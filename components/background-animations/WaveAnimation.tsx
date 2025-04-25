"use client";

import React from 'react';

const WaveAnimation: React.FC = () => {
  console.log("[WaveAnimation] Rendering");
  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 1000 300" // Adjust viewBox for aspect ratio
      preserveAspectRatio="xMidYMid slice" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'rgba(255, 255, 255, 0.1)', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'rgba(255, 255, 255, 0.0)', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Multiple wave layers for parallax effect */}
      <path 
        fill="url(#waveGradient)" 
        d="M0,150 Q250,100 500,150 T1000,150 L1000,300 L0,300 Z"
      >
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0; -500,0; 0,0" // Shift horizontally and back
          dur="20s" // Slower animation
          repeatCount="indefinite"
        />
         <animate 
            attributeName="d"
            values="M0,150 Q250,100 500,150 T1000,150 L1000,300 L0,300 Z;
                    M0,150 Q250,200 500,150 T1000,150 L1000,300 L0,300 Z;
                    M0,150 Q250,100 500,150 T1000,150 L1000,300 L0,300 Z"
            dur="10s"
            repeatCount="indefinite"
        />
      </path>
      
      <path 
         fill="url(#waveGradient)"
        style={{ opacity: 0.7 }}
        d="M0,170 Q200,130 400,170 T800,170 T1200,170 L1200,300 L0,300 Z"
      >
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; -400,0; 0,0"
            dur="25s" // Slightly different speed
            repeatCount="indefinite"
          />
            <animate 
            attributeName="d"
            values="M0,170 Q200,130 400,170 T800,170 T1200,170 L1200,300 L0,300 Z;
                    M0,170 Q200,210 400,170 T800,170 T1200,170 L1200,300 L0,300 Z;
                    M0,170 Q200,130 400,170 T800,170 T1200,170 L1200,300 L0,300 Z"
            dur="12s"
            repeatCount="indefinite"
        />
      </path>

       <path 
        fill="url(#waveGradient)"
        style={{ opacity: 0.5 }}
        d="M0,190 Q150,160 300,190 T600,190 T900,190 T1200, 190 L1200,300 L0,300 Z"
      >
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; -300,0; 0,0"
            dur="30s" // Even slower
            repeatCount="indefinite"
          />
           <animate 
            attributeName="d"
            values="M0,190 Q150,160 300,190 T600,190 T900,190 T1200, 190 L1200,300 L0,300 Z;
                    M0,190 Q150,220 300,190 T600,190 T900,190 T1200, 190 L1200,300 L0,300 Z;
                    M0,190 Q150,160 300,190 T600,190 T900,190 T1200, 190 L1200,300 L0,300 Z"
            dur="15s"
            repeatCount="indefinite"
          />
      </path>
    </svg>
  );
};

export default WaveAnimation; 