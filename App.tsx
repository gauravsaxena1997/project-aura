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
    updateGrabbedPosition,
    setObjectColor, // NEW: Enhanced capability
    removeObject // NEW: Deletion capability
  } = useObjectManager({ maxObjects: 3 });

  // CRITICAL: Use priority hook as single source of truth for gesture decisions
  const grabbedObj = objects.find(obj => obj.isGrabbed);
  const { activeGesture, priority, shouldAllowGesture } = useGesturePriority(
    handStateRef,
    grabbedObj?.id || null
  );

  // --- VOICE COMMAND HANDLERS ---
  const handleColorCommand = useCallback((color: string) => {
    // Legacy support wrapper
    const hex = COLOR_MAP[color];
    if (hex) setBaseColor(hex);
  }, []);

  const handleVoiceCommand = useCallback((transcript: string) => {
    const command = transcript.toLowerCase().trim();

    // 1. OBJECT MANAGEMENT COMMANDS

    // Deletion (Check first to avoid conflict with creation if phrasing overlaps)
    if (command.includes('clear') || command.includes('remove') || command.includes('delete')) {
      // Global Delete
      if (command.includes('all')) {
        clearObjects();
        handleGesture("ALL OBJECTS REMOVED");
        return;
      }

      // Context-Aware Delete (High Priority)
      if (priority >= 100 && grabbedObj) {
        // User said "remove this" / "remove object" while holding one
        removeObject(grabbedObj.id);
        handleGesture("OBJECT REMOVED");
        return;
      } else {
        // Fallback for "remove object" without context
        handleGesture("GRAB OBJECT TO REMOVE");
        return;
      }
    }

    // Creation
    if (command.includes('create') || command.includes('add') || command.includes('spawn')) {
      if (command.includes('object')) {
        // Parse quantity: "one", "two", "three", "1", "2", "3"
        let count = 1;
        if (command.includes('two') || command.includes('2')) count = 2;
        if (command.includes('three') || command.includes('3')) count = 3;

        // Check limits
        if (objects.length + count > 3) {
          handleGesture(`MAX LIMIT REACHED (3 TOTAL)`);
          return;
        }

        // Spawn loop
        for (let i = 0; i < count; i++) {
          // Small delay to prevent stacking exact positions (though randomizer handles this mostly)
          setTimeout(() => spawnObject(), i * 100);
        }

        handleGesture(count > 1 ? `${count} OBJECTS CREATED` : "OBJECT CREATED");
        return;
      }
    }

    // 2. COLOR COMMANDS (PRIORITY AWARE)
    for (const [colorName, hex] of Object.entries(COLOR_MAP)) {
      if (command.includes(colorName)) {

        // PRIORITY CHECK: Resolve intent based on context
        // Priority 100 = GRAB (Focus context)
        // Priority < 100 = IDLE/GESTURE (Ambient context)

        if (priority >= 100 && grabbedObj) {
          // 🎯 Context: Focused Object
          setObjectColor(grabbedObj.id, hex);
          handleGesture(`COLOR >> ${colorName.toUpperCase()} (OBJECT)`);
        } else {
          // 🌍 Context: Environment
          setBaseColor(hex);
          setPulseTrigger(prev => prev + 1);
          handleGesture(`COLOR >> ${colorName.toUpperCase()} (ENV)`);
        }
        return;
      }
    }
  }, [spawnObject, clearObjects, handleGesture, setBaseColor, setPulseTrigger, objects.length, priority, grabbedObj, setObjectColor, removeObject]);

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