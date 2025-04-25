"use client";

import React, { useRef, Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from 'three'; // Import THREE namespace

// Internal component containing the points and animation logic
const GlobePoints: React.FC = () => {
  const points = useRef<THREE.Points>(null!); // Use non-null assertion
  const particleCount = 4000;
  const baseRadius = 3.5;
  const maxRadius = baseRadius * 1.4;
  const baseSpeed = 0.2; // Base rotation speed

  // --- Use useMemo for initializing particle data --- 
  const particleData = useMemo(() => {
      console.log("[ParticleGlobe] Initializing particle data...");
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const speeds = new Float32Array(particleCount);

      const colorPalette = [
        [0.0, 0.8, 1.0], // Cyan
        [0.0, 0.6, 0.8], // Lighter blue
        [0.0, 0.5, 0.7], // Medium blue
        [0.0, 0.7, 0.9], // Sky blue
        [0.1, 0.7, 0.9], // Slightly greenish blue
        [0.0, 0.9, 1.0], // Bright cyan
      ];

      for (let i = 0; i < particleCount; i++) {
          const phi = Math.random() * Math.PI * 2;
          const theta = Math.random() * Math.PI;
          let radiusVariation;
          if (i % 4 === 0) { radiusVariation = baseRadius * (0.5 + Math.random() * 0.5); }
          else if (i % 4 === 1) { radiusVariation = baseRadius * (0.8 + Math.random() * 0.4); }
          else if (i % 4 === 2) { radiusVariation = baseRadius * (0.9 + Math.random() * 0.3); }
          else { radiusVariation = baseRadius * (0.7 + Math.random() * 0.7); }

          const x = radiusVariation * Math.sin(theta) * Math.cos(phi);
          const y = radiusVariation * Math.sin(theta) * Math.sin(phi);
          const z = radiusVariation * Math.cos(theta);
          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;

          const distanceFactor = 1 - radiusVariation / maxRadius;
          const colorIndex = Math.floor(Math.random() * colorPalette.length);
          const baseColor = colorPalette[colorIndex];
          const r = baseColor[0] * (0.9 + Math.random() * 0.2);
          const g = baseColor[1] * (0.9 + Math.random() * 0.2);
          const b = baseColor[2] * (0.9 + Math.random() * 0.2);
          const fogFactor = 0.3 + distanceFactor * 0.7;
          colors[i * 3] = r * fogFactor;
          colors[i * 3 + 1] = g * fogFactor;
          colors[i * 3 + 2] = b * fogFactor;

          const speedRandom = Math.random();
          let speedFactor;
          if (speedRandom < 0.05) { speedFactor = 0.4 + Math.random() * 0.2; }
          else if (speedRandom > 0.95) { speedFactor = 1.8 + Math.random() * 0.4; }
          else { speedFactor = 0.9 + Math.random() * 0.2; }
          speeds[i] = speedFactor;
      }
      return { positions, colors, speeds };
  }, [particleCount, baseRadius, maxRadius]); // Dependencies ensure recalculation if these change (they don't here)

  // Store speeds in a ref for useFrame access without triggering re-renders
  const particleSpeeds = useRef(particleData.speeds);

  useFrame((state, delta) => {
    if (points.current) {
      // Main globe rotation
      points.current.rotation.y += baseSpeed * delta;

      // Apply individual speed variations
      const positions = points.current.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const speedFactor = particleSpeeds.current[i]; // Read from ref
        const angleOffset = baseSpeed * delta * (speedFactor - 1);
        const x = positions[i3];
        const z = positions[i3 + 2];
        const distanceFromY = Math.sqrt(x * x + z * z);

        if (distanceFromY > 0.01) {
          let currentAngle = Math.atan2(z, x);
          currentAngle += angleOffset;
          positions[i3] = distanceFromY * Math.cos(currentAngle);
          positions[i3 + 2] = distanceFromY * Math.sin(currentAngle);
        }
      }
      points.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particleData.positions} // Use memoized array
          itemSize={3}
          args={[particleData.positions, 3]} // Use memoized array
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={particleData.colors} // Use memoized array
          itemSize={3}
          args={[particleData.colors, 3]} // Use memoized array
        />
      </bufferGeometry>
      <pointsMaterial
        attach="material"
        size={0.03} // Revert size
        vertexColors // Restore vertexColors
        transparent // Restore transparent
        opacity={0.8} // Restore opacity
        // color="red" // Remove solid color
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Main exported component rendering the Canvas
const ParticleGlobe: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 50 }} // Zoom out by increasing Z distance
      style={{
        position: "absolute",
        inset: 0,
        zIndex: -1, // Ensure it's behind UI elements
        pointerEvents: "none", // Allow clicks to pass through
      }}
    >
       {/* Add subtle ambient light */}
       <ambientLight intensity={0.2} /> 
      <Suspense fallback={null}> {/* Recommended for potentially async components */}
        <GlobePoints />
      </Suspense>
    </Canvas>
  );
};

export default ParticleGlobe; 