import React, { useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { VideoBackground } from './components/VideoBackground';
import { Aura3D } from './components/Aura3D';
import { HUD } from './components/HUD';
import { useVoiceCommand } from './hooks/useVoiceCommand';
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
  const [isSystemInitialized, setIsSystemInitialized] = useState(false);
  
  // Voice State Machine
  const [voiceMode, setVoiceMode] = useState<'IDLE' | 'LISTENING'>('IDLE');
  const voiceModeRef = useRef<'IDLE' | 'LISTENING'>('IDLE'); 
  const listeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Centralized Gesture Handler
  const handleGesture = useCallback((message: string) => {
    setLogMessage(message);
    if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
    logTimeoutRef.current = setTimeout(() => {
        setLogMessage("");
    }, 2000);
  }, []);

  // --- VOICE COMMAND HANDLER (STABILIZED) ---
  // Must use useCallback to prevent the hook from restarting infinitely
  const handleVoiceCommand = useCallback((command: string) => {
      const cleanCommand = command.toLowerCase();

      // 1. WAKE WORD DETECTION
      if (cleanCommand === 'aura') {
        setPulseTrigger(prev => prev + 1);
        handleGesture("AURA WAKE WORD DETECTED");
        
        setVoiceMode('LISTENING');
        voiceModeRef.current = 'LISTENING';

        if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
        listeningTimeoutRef.current = setTimeout(() => {
            setVoiceMode('IDLE');
            voiceModeRef.current = 'IDLE';
            handleGesture("TIMEOUT: NO COMMAND");
        }, 5000); 
      } 
      // 2. COMMAND EXECUTION 
      else if (cleanCommand.startsWith('color')) {
        // Allow command if listening OR if manually typed (implied bypass)
        if (voiceModeRef.current === 'LISTENING' || !cleanCommand.startsWith('voice:')) {
            // Extract color name (handle "color:red" or "color red")
            const parts = cleanCommand.split(/[: ]/);
            const colorName = parts[parts.length - 1]; // Last part is usually the color
            
            if (COLOR_MAP[colorName]) {
                const hex = COLOR_MAP[colorName];
                setBaseColor(hex);
                handleGesture(`COLOR SET >> ${colorName.toUpperCase()}`);
                
                setVoiceMode('IDLE');
                voiceModeRef.current = 'IDLE';
                if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
            }
        }
      }
  }, [handleGesture]);

  // Initialize Voice Command
  const { isListening: isMicActive, error: voiceError, startListening } = useVoiceCommand({
    onKeywordDetected: handleVoiceCommand
  });

  const handleStartSystem = () => {
      setIsSystemInitialized(true);
      startListening(); 
  };

  if (!isSystemInitialized) {
      return (
          <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-cyan-400 font-mono z-50 relative">
              <h1 className="text-4xl tracking-[0.5em] mb-8 animate-pulse">AURA TERMINAL</h1>
              <button 
                onClick={handleStartSystem}
                className="px-8 py-4 border border-cyan-500 hover:bg-cyan-900/50 transition-all tracking-widest text-lg cursor-pointer"
              >
                  INITIALIZE SYSTEM
              </button>
              <p className="mt-4 text-xs text-cyan-700">ENABLE CAMERA & MICROPHONE ACCESS</p>
          </div>
      )
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* Layer 1: Video Background */}
      <div className="absolute inset-0 z-[1]">
          <VideoBackground handStateRef={handStateRef} onGesture={handleGesture} />
      </div>

      {/* Layer 2: 3D Scene */}
      <div className="absolute inset-0 z-[5] pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }} gl={{ alpha: true }}>
          <Aura3D handStateRef={handStateRef} pulseTrigger={pulseTrigger} baseColor={baseColor} />
        </Canvas>
      </div>

      {/* Layer 3: HUD */}
      <div className="absolute inset-0 z-[10] pointer-events-none">
          <HUD 
            logMessage={logMessage} 
            isListening={isMicActive}
            isSystemListening={voiceMode === 'LISTENING'}
            error={voiceError}
            onManualCommand={handleVoiceCommand}
          />
      </div>
    </div>
  );
};

export default App;