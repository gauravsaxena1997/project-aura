import React, { useState, useEffect, useRef } from 'react';

interface HUDProps {
    logMessage: string;
    isListening: boolean;
    isSystemListening: boolean;
    error?: string | null;
    onManualCommand: (cmd: string) => void;
}

export const HUD: React.FC<HUDProps> = ({ logMessage, isListening, isSystemListening, error, onManualCommand }) => {
  const [time, setTime] = useState('');
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && inputValue.trim()) {
          onManualCommand(inputValue.trim());
          setInputValue('');
      }
  };

  const infoContent: Record<string, string> = {
      MOVE: "Spatial Navigation: Your index finger acts as the cursor. The environment reacts to your presence, with particles parting like water around your hand.",
      PINCH: "Precision Selection: Bringing your Index and Thumb together triggers a 'Click'. Use this to select objects or activate buttons. The reticle turns Cyan.",
      GRAB: "Matter Manipulation: Closing your hand into a Fist exerts a magnetic force, pulling all digital matter (particles) into a structured sphere around you.",
      FLICK: "Quick Navigation: A rapid horizontal movement of the wrist triggers a 'Swipe' command. The particles will streak white to visualize the wind force.",
      DUAL: "Energy Field Generation: Raising both hands creates a resonant field. Moving hands apart expands the energy sphere; moving them closer condenses it."
  };

  return (
    <div className="absolute inset-0 p-8 flex flex-col justify-between text-white/80 font-mono tracking-widest z-10 pointer-events-none">
      
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-sm shadow-lg flex items-center gap-4">
                <div>
                    <p className="text-xs text-cyan-400 mb-1">SYSTEM_STATUS</p>
                    <p className="text-sm font-bold animate-pulse">ACTIVE</p>
                </div>
                {/* Audio Status Indicator */}
                <div className="border-l border-white/10 pl-4">
                     <p className="text-xs text-cyan-400 mb-1">AUDIO_INPUT</p>
                     <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-600' : (isListening ? 'bg-green-500 animate-pulse' : 'bg-yellow-500')}`}></div>
                        <p className="text-[10px]">
                            {error === 'PERM_DENIED' ? "DENIED (SANDBOX)" : (error === 'NO_MIC' ? "NO MIC" : (isListening ? "ONLINE" : "OFFLINE"))}
                        </p>
                     </div>
                </div>
            </div>

            {/* Instruction Panel */}
            <div className="bg-black/60 backdrop-blur-md border-l-2 border-cyan-500 p-4 rounded-r-lg max-w-sm pointer-events-auto">
                <p className="text-xs text-cyan-400 mb-2 font-bold border-b border-white/10 pb-1">CONTROL PROTOCOLS</p>
                <ul className="text-xs space-y-3 text-white/80">
                    <li className="grid grid-cols-[20px_1fr_20px] items-center group">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <div><span className="font-bold text-white block">MOVE</span><span className="text-[10px] text-white/50">Cursor</span></div>
                        <button onClick={() => setActiveInfo("MOVE")} className="opacity-50 hover:opacity-100 hover:text-cyan-400">ⓘ</button>
                    </li>
                    <li className="grid grid-cols-[20px_1fr_20px] items-center group">
                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                        <div><span className="font-bold text-white block">PINCH</span><span className="text-[10px] text-white/50">Select</span></div>
                        <button onClick={() => setActiveInfo("PINCH")} className="opacity-50 hover:opacity-100 hover:text-cyan-400">ⓘ</button>
                    </li>
                    <li className="grid grid-cols-[20px_1fr_20px] items-center group">
                        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                        <div><span className="font-bold text-white block">FIST</span><span className="text-[10px] text-white/50">Grab</span></div>
                        <button onClick={() => setActiveInfo("GRAB")} className="opacity-50 hover:opacity-100 hover:text-cyan-400">ⓘ</button>
                    </li>
                    <li className="grid grid-cols-[20px_1fr_20px] items-center group">
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                         <div><span className="font-bold text-white block">TWO HANDS</span><span className="text-[10px] text-white/50">Energy</span></div>
                        <button onClick={() => setActiveInfo("DUAL")} className="opacity-50 hover:opacity-100 hover:text-cyan-400">ⓘ</button>
                    </li>
                </ul>
            </div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-sm shadow-lg">
            <p className="text-lg font-bold">{time}</p>
        </div>
      </div>

      {/* Info Modal */}
      {activeInfo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto z-50">
              <div className="bg-gray-900 border border-cyan-500 p-6 max-w-md relative shadow-[0_0_50px_rgba(6,182,212,0.3)]">
                  <button onClick={() => setActiveInfo(null)} className="absolute top-2 right-4 text-gray-500 hover:text-white text-xl">×</button>
                  <h2 className="text-cyan-400 font-bold text-lg mb-4 border-b border-gray-700 pb-2">PROTOCOL: {activeInfo}</h2>
                  <p className="text-sm leading-relaxed text-gray-300">{infoContent[activeInfo]}</p>
                  <div className="mt-6 flex justify-end">
                      <button onClick={() => setActiveInfo(null)} className="bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 px-4 py-1 text-xs border border-cyan-700">ACKNOWLEDGE</button>
                  </div>
              </div>
          </div>
      )}

      {/* Toast */}
      {(logMessage || isSystemListening) && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className={`
                ${isSystemListening ? 'bg-green-900/80 border-green-400' : 'bg-cyan-900/60 border-cyan-400/50'}
                border px-8 py-4 rounded backdrop-blur-xl shadow-[0_0_30px_rgba(34,211,238,0.4)] animate-pulse transition-colors duration-300
              `}>
                  <p className={`${isSystemListening ? 'text-green-300' : 'text-cyan-300'} font-bold text-xl tracking-[0.2em] uppercase`}>
                      {isSystemListening ? "LISTENING..." : logMessage}
                  </p>
              </div>
          </div>
      )}

      {/* Bottom Bar */}
      <div className="flex justify-between items-end w-full">
        <div className="flex flex-col gap-2 flex-grow">
             <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-1 rounded-sm shadow-lg flex items-center justify-between mr-4">
                <p className="text-[10px] text-white/50">
                    CURRENT_EVENT: <span className="text-white font-bold">{isSystemListening ? "AWAITING_COMMAND..." : (logMessage || "IDLE")}</span>
                </p>
                
                {/* Manual Terminal Input */}
                <div className="flex items-center gap-2 pointer-events-auto ml-8 flex-grow max-w-md">
                    <span className="text-cyan-500 text-xs">{'>'}</span>
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="TERMINAL_INPUT (e.g., 'aura', 'color red')"
                        className="bg-transparent border-none outline-none text-xs text-cyan-300 placeholder-white/20 w-full font-mono uppercase"
                    />
                </div>
            </div>
        </div>

        <div className="text-right">
             <p className="text-[10px] text-white/40">AURA TERMINAL v0.4</p>
             <p className="text-[10px] text-white/40">AETHERIS INTELLIGENCE</p>
        </div>
      </div>
    </div>
  );
};