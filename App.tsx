import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { VideoBackground } from './components/VideoBackground';
import { Aura3D } from './components/Aura3D';
import { HUD } from './components/HUD';
import { useVoiceCommand } from './hooks/useVoiceCommand';
import { HandTrackingState } from './types';

const App: React.FC = () => {
  // Shared Mutable Ref for high-performance updates without re-renders
  const handStateRef = useRef<HandTrackingState>({
    indexTip: null,
    thumbTip: null,
    wrist: null,
    isPinching: false,
    isFist: false, 
    isPresent: false,
    swipeDirection: 'none',
  });

  // State for one-off events (Voice Pulse)
  const [pulseTrigger, setPulseTrigger] = useState(0);
  const [logMessage, setLogMessage] = useState("");
  const logTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Centralized Gesture Handler
  const handleGesture = useCallback((message: string) => {
    setLogMessage(message);
    
    // Clear log after 2 seconds
    if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
    logTimeoutRef.current = setTimeout(() => {
        setLogMessage("");
    }, 2000);
  }, []);

  // Initialize Voice Command
  useVoiceCommand({
    onKeywordDetected: (word) => {
      if (word === 'aura') {
        setPulseTrigger(prev => prev + 1);
        handleGesture("VOICE COMMAND: AURA");
      }
    }
  });

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* Layer 1: Video Background (Bottom) */}
      <div className="absolute inset-0 z-[1]">
          <VideoBackground handStateRef={handStateRef} onGesture={handleGesture} />
      </div>

      {/* Layer 2: 3D Scene Overlay (Middle) */}
      <div className="absolute inset-0 z-[5] pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }} gl={{ alpha: true }}>
          <Aura3D handStateRef={handStateRef} pulseTrigger={pulseTrigger} />
        </Canvas>
      </div>

      {/* Layer 3: HUD Overlay (Top) */}
      <div className="absolute inset-0 z-[10] pointer-events-none">
          <HUD logMessage={logMessage} />
      </div>
    </div>
  );
};

export default App;