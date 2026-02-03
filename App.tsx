import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { VideoBackground } from './components/VideoBackground';
import { Aura3D } from './components/Aura3D';
import { HUD } from './components/HUD';
import { useVoiceCommand } from './hooks/useVoiceCommand';
import { useObjectManager } from './hooks/useObjectManager';
import { useGesturePriority } from './hooks/useGesturePriority';
import { HandTrackingState } from './types';

// Neon/Cyberpunk Color Palette Map
const COLOR_MAP: Record<string, string> = {
  red: "#ff2a2a",
  green: "#2aff2a",
  blue: "#2a2aff",
  white: "#ffffff",
  cyan: "#22d3ee",
  purple: "#bd00ff",
  pink: "#ff00bd",
  orange: "#ff7f00",
  yellow: "#ffff00",
  magenta: "#ff00ff",
  teal: "#008080",
  violet: "#8f00ff",
  gold: "#ffd700"
};

const App: React.FC = () => {
  // Shared Mutable Ref for high-performance updates without re-renders
  const handStateRef = useRef<HandTrackingState>({
    indexTip: null,
    thumbTip: null,
    wrist: null,
    isTwoHanded: false,
    handDistance: 0,
    centerPoint: null,
    isPinching: false,
    isFist: false,
    isPresent: false,
    swipeDirection: 'none',
  });

  // State
  const [pulseTrigger, setPulseTrigger] = useState(0);
  const [baseColor, setBaseColor] = useState("#22d3ee");
  const [logMessage, setLogMessage] = useState("");

  const logTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPinchRef = useRef(false); // Track previous pinch state

  // Centralized Gesture Handler
  const handleGesture = useCallback((message: string) => {
    setLogMessage(message);
    if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
    logTimeoutRef.current = setTimeout(() => {
      setLogMessage("");
    }, 2000);
  }, []);

  // Initialize Object Manager
  const {
    objects,
    spawnObject,
    clearObjects,
    updateHover,
    grabObject,
    releaseObject,
    updateGrabbedPosition
  } = useObjectManager({ maxObjects: 3 });

  // CRITICAL: Use priority hook as single source of truth for gesture decisions
  const grabbedObj = objects.find(obj => obj.isGrabbed);
  const { activeGesture, priority, shouldAllowGesture } = useGesturePriority(
    handStateRef,
    grabbedObj?.id || null
  );

  // --- VOICE COMMAND HANDLERS ---
  const handleColorCommand = useCallback((color: string) => {
    const hex = COLOR_MAP[color];
    if (hex) {
      setBaseColor(hex);
      setPulseTrigger(prev => prev + 1);
      handleGesture(`COLOR >> ${color.toUpperCase()}`);
    }
  }, [handleGesture]);

  const handleVoiceCommand = useCallback((transcript: string) => {
    const command = transcript.toLowerCase().trim();

    // Check for object commands
    if (command.includes('create') && command.includes('object')) {
      // Check max limit
      if (objects.length >= 3) {
        handleGesture("MAX OBJECTS REACHED (3/3)");
        return;
      }
      spawnObject();
      handleGesture(`OBJECT CREATED (${objects.length + 1}/3)`);
      return;
    }

    // Accept multiple phrasings: "clear objects", "remove all objects", "remove all object"
    if ((command.includes('clear') || command.includes('remove')) &&
      (command.includes('object') || command.includes('all'))) {
      clearObjects();
      handleGesture("ALL OBJECTS REMOVED");
      return;
    }

    // Check for color commands
    for (const [colorName, hex] of Object.entries(COLOR_MAP)) {
      if (command.includes(colorName)) {
        setBaseColor(hex);
        setPulseTrigger(prev => prev + 1);
        handleGesture(`COLOR >> ${colorName.toUpperCase()}`);
        return;
      }
    }
  }, [spawnObject, clearObjects, handleGesture, setBaseColor, setPulseTrigger, objects.length]);

  // Create stable ref for voice handler to prevent re-initialization
  const handleVoiceCommandRef = useRef(handleVoiceCommand);
  useEffect(() => {
    handleVoiceCommandRef.current = handleVoiceCommand;
  }, [handleVoiceCommand]);

  // Initialize Voice Command with stable handler reference
  const { isListening: isMicActive, error: voiceError, startListening } = useVoiceCommand({
    onColorDetected: useCallback((transcript: string) => {
      handleVoiceCommandRef.current(transcript);
    }, []) // Empty deps - uses ref which is always stable
  });

  // Auto-start system on mount (runs only once)
  useEffect(() => {
    startListening();
  }, [startListening]);

  // DEV UTILITY: Expose command handler globally for console testing
  useEffect(() => {
    (window as any).runCommand = (command: string) => {
      console.log(`[DEV] Running command: "${command}"`);
      handleVoiceCommandRef.current(command);
    };
    console.log('[DEV] Debug utility ready! Use: window.runCommand("create object")');

    return () => {
      delete (window as any).runCommand;
    };
  }, []); // Empty deps - runs once, uses ref

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* Layer 1: Video Background */}
      <div className="absolute inset-0 z-[1]">
        <VideoBackground handStateRef={handStateRef} onGesture={handleGesture} />
      </div>

      {/* Layer 2: 3D Scene */}
      <div className="absolute inset-0 z-[5] pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }} gl={{ alpha: true }}>
          <Aura3D
            handStateRef={handStateRef}
            pulseTrigger={pulseTrigger}
            baseColor={baseColor}
            objects={objects}
            objectManager={{
              updateHover,
              grabObject,
              releaseObject,
              updateGrabbedPosition
            }}
            prevPinchRef={prevPinchRef}
            activeGesture={activeGesture}
          />
        </Canvas>
      </div>

      {/* Layer 3: HUD */}
      <div className="absolute inset-0 z-[10] pointer-events-none">
        <HUD
          logMessage={logMessage}
          isListening={isMicActive}
          isSystemListening={false}
          error={voiceError}
          onRetryMic={startListening}
          objectCount={objects.length}
          activeGesture={activeGesture}
        />
      </div>
    </div>
  );
};

export default App;