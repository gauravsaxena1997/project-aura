import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { VideoBackground } from './components/VideoBackground';
import { Aura3D } from './components/Aura3D';
import { HUD } from './components/HUD';
import { InformationCarousel } from './components/InformationCarousel';
import { InteractionController } from './components/InteractionController';
import { useVoiceCommand } from './hooks/useVoiceCommand';
import { useObjectManager } from './hooks/useObjectManager';
import { useGesturePriority } from './hooks/useGesturePriority';
import { useClickSystem } from './hooks/useClickSystem';
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
    handDepthDelta: 0,
    isPinching: false,
    isTapping: false,
    isFist: false,
    isPresent: false,
    swipeDirection: 'none',
  });

  // State
  const [pulseTrigger, setPulseTrigger] = useState(0);
  const [baseColor, setBaseColor] = useState("#22d3ee");
  const [logMessage, setLogMessage] = useState("");
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  // NEW: Carousel State
  const [isCarouselOpen, setIsCarouselOpen] = useState(false);

  // NEW: Centralized Click System
  const { clickState, triggerInteraction } = useClickSystem();

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
    setObjectColor,
    removeObject
  } = useObjectManager({ maxObjects: 3 });

  // CRITICAL: Use priority hook as single source of truth for gesture decisions
  const grabbedObj = objects.find(obj => obj.isGrabbed);
  const { activeGesture, priority } = useGesturePriority(
    handStateRef,
    grabbedObj?.id || null
  );

  // --- VOICE COMMAND HANDLERS ---
  const handleVoiceCommand = useCallback((transcript: string) => {
    const command = transcript.toLowerCase().trim();

    // 0. CAROUSEL COMMANDS (Block other commands if active)
    if (isCarouselOpen) {
      if (command.includes('close') || command.includes('exit') || command.includes('hide')) {
        setIsCarouselOpen(false);
        handleGesture("CAROUSEL CLOSED");
        return;
      }
      return; // Ignore other commands while carousel is open (Phase 1)
    }

    // ACTIVATION COMMANDS
    if (command.includes('activate') || command.includes('open') || command.includes('show')) {
      if (command.includes('carousel') || command.includes('gallery') || command.includes('slider') || command.includes('information')) {
        setIsCarouselOpen(true);
        handleGesture("CAROUSEL ACTIVATED");
        return;
      }
    }

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
  }, [isCarouselOpen, spawnObject, clearObjects, handleGesture, setBaseColor, setPulseTrigger, objects.length, priority, grabbedObj, setObjectColor, removeObject]);

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

    return () => {
      delete (window as any).runCommand;
    };
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* Layer 1: Video Background (Always visible) */}
      <div className="absolute inset-0 z-[1]">
        <VideoBackground
          handStateRef={handStateRef}
          onGesture={handleGesture}
          onVideoReady={setVideoElement}
        />
      </div>

      {/* Layer 1.5: Interaction Controller (Logic Layer) - Disabled in Carousel Mode (Phase 1) */}
      {!isCarouselOpen && (
        <InteractionController
          handStateRef={handStateRef}
          videoElement={videoElement}
          onTrigger={triggerInteraction}
          onGesture={handleGesture}
        />
      )}

      {/* Layer 2: 3D Scene - Hidden in Carousel Mode */}
      {!isCarouselOpen && (
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
      )}

      {/* Layer 3: HUD - Hidden in Carousel Mode */}
      {!isCarouselOpen && (
        <div className="absolute inset-0 z-[10] pointer-events-none">
          <HUD
            logMessage={logMessage}
            isListening={isMicActive}
            isSystemListening={false}
            error={voiceError}
            onRetryMic={startListening}
            objectCount={objects.length}
            activeGesture={activeGesture}
            clickCount={clickState.count}
            clickSource={clickState.source}
          />
        </div>
      )}

      {/* Layer 4: Information Carousel (Overlay) */}
      <InformationCarousel
        isVisible={isCarouselOpen}
        onClose={() => setIsCarouselOpen(false)}
        handStateRef={handStateRef}
        clickState={clickState}
      />
      {/* Test Button (Phase 1 Only) */}
      {/* {!isCarouselOpen && (
        <div className="absolute top-4 left-4 z-[20] pointer-events-auto">
          <button
            onClick={() => setIsCarouselOpen(true)}
            className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/50 text-cyan-300 rounded text-sm transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">gallery_thumbnail</span>
            Open Carousel
          </button>
        </div>
      )} */}
    </div>
  );
};

export default App;
