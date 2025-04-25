"use client";

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

const ParticlesAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>();

  // Use more visible colors
  const colors = [
    'rgba(180, 210, 255, 0.5)', // Light Blueish-White (more opaque)
    'rgba(220, 235, 255, 0.4)', // Lighter Blueish-White
    'rgba(255, 255, 255, 0.3)'  // Faint White (still subtle)
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    // Initialize particles
    // Calculate density based on area (e.g., 1 particle per 20000 pixels)
    const desiredDensity = 1 / 20000;
    const numParticles = Math.max(20, Math.min(150, Math.round(width * height * desiredDensity))); // Clamp between 20 and 150
    console.log(`[ParticlesAnimation] Canvas size: ${width}x${height}, Num Particles: ${numParticles}`);

    if (particlesRef.current.length === 0) { // Only initialize if empty
        particlesRef.current = []; // Clear just in case
        for (let i = 0; i < numParticles; i++) {
            particlesRef.current.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3, // Slowed down velocity
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 1.5 + 0.5, // Smaller particles
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
    }

    const animate = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      // Check if canvas size changed significantly
      if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          // Reinitialize particles if needed (optional, could just adjust bounds)
          // particlesRef.current = []; // Reset if desired
          // Initialize particles... 
      }

      ctx.clearRect(0, 0, width, height);

      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap particles around edges
        if (p.x < -p.radius) p.x = width + p.radius;
        if (p.x > width + p.radius) p.x = -p.radius;
        if (p.y < -p.radius) p.y = height + p.radius;
        if (p.y > height + p.radius) p.y = -p.radius;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: -1,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
};

export default ParticlesAnimation; 