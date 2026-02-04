import React, { useState, useEffect } from 'react';
import { VoiceErrorType } from '../hooks/useVoiceCommand';

interface HUDProps {
    logMessage: string;
    isListening: boolean;
    isSystemListening: boolean;
    error?: VoiceErrorType;
    onRetryMic?: () => void;
    objectCount: number;
    activeGesture: string;
    clickCount: number;
    clickSource: 'tap' | 'blink' | null;
}

export const HUD: React.FC<HUDProps> = ({ logMessage, isListening, isSystemListening, error, onRetryMic, objectCount, activeGesture, clickCount, clickSource }) => {
    const [time, setTime] = useState('');
    const [activeInfo, setActiveInfo] = useState<string | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-US', { hour12: false }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const infoContent: Record<string, string> = {
        MOVE: "Spatial Navigation: Your index finger acts as the cursor. The environment reacts to your presence, with particles parting like water around your hand.",
        PINCH: "Precision Selection: Bringing your Index and Thumb together triggers a 'Click'. Use this to select objects or activate buttons. The reticle turns Cyan.",
        OBJECT_GRAB: "Object Manipulation: Hover your index finger near a 3D object to highlight it. Pinch (thumb + index) to grab it. Keep pinching to carry the object. Release pinch to drop.",
        GRAVITY: "Particle Gravity: Closing your hand into a Fist exerts a magnetic force, pulling all particles into a structured sphere around you.",
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
                                <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-600' :
                                    (isListening ? 'bg-green-500 animate-pulse' : 'bg-yellow-500')
                                    }`}></div>
                                <p className="text-[10px]">
                                    {error === 'PERM_DENIED' ? "BLOCKED" :
                                        error === 'NO_DEVICE' ? "NO MIC FOUND" :
                                            error === 'NO_MIC' ? "MIC ERROR" :
                                                error === 'NO_API' ? "NOT SUPPORTED" :
                                                    error === 'PERM_DISMISSED' ? "DISMISSED" :
                                                        (isListening ? "ONLINE" : "OFFLINE")}
                                </p>
                                {error && onRetryMic && (
                                    <button
                                        onClick={onRetryMic}
                                        className="text-[8px] px-2 py-0.5 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-700 text-cyan-300 pointer-events-auto"
                                    >
                                        RETRY
                                    </button>
                                )}
                            </div>
                            {error && (
                                <p className="text-[8px] text-red-400/70 mt-1 max-w-[150px]">
                                    {error === 'PERM_DENIED' ? "Check Chrome mic permission" :
                                        error === 'NO_DEVICE' ? "Connect a microphone" :
                                            error === 'PERM_DISMISSED' ? "Click RETRY to allow mic" :
                                                "Check System Settings → Privacy"}
                                </p>
                            )}
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
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                <div><span className="font-bold text-white block">GRAB</span><span className="text-[10px] text-white/50">Objects</span></div>
                                <button onClick={() => setActiveInfo("OBJECT_GRAB")} className="opacity-50 hover:opacity-100 hover:text-cyan-400">ⓘ</button>
                            </li>
                            <li className="grid grid-cols-[20px_1fr_20px] items-center group">
                                <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                                <div><span className="font-bold text-white block">FIST</span><span className="text-[10px] text-white/50">Gravity</span></div>
                                <button onClick={() => setActiveInfo("GRAVITY")} className="opacity-50 hover:opacity-100 hover:text-cyan-400">ⓘ</button>
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

            {/* Bottom Bar */}
            <div className="flex justify-between items-end w-full">
                <div className="flex gap-4">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-sm shadow-lg">
                        <p className="text-[10px] text-white/50">
                            CURRENT_EVENT: <span className="text-white font-bold">{isSystemListening ? "AWAITING_COMMAND..." : (logMessage || "IDLE")}</span>
                        </p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-sm shadow-lg">
                        <p className="text-[10px] text-white/50">
                            ACTIVE_GESTURE: <span className={`font-bold ${activeGesture === 'NONE' ? 'text-white/30' : 'text-yellow-400'
                                }`}>{activeGesture}</span>
                        </p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-sm shadow-lg">
                        <p className="text-[10px] text-white/50">
                            OBJECTS: <span className="text-cyan-400 font-bold">{objectCount}/3</span>
                        </p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-sm shadow-lg">
                        <p className="text-[10px] text-white/50">
                            CLICK_COUNT: <span className="text-green-400 font-bold">{clickCount}</span>
                            {clickSource && (
                                <span className="text-cyan-400 ml-2">({clickSource.toUpperCase()})</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-[10px] text-white/40">AURA TERMINAL v0.5</p>
                    <p className="text-[10px] text-white/40">AETHERIS INTELLIGENCE</p>
                </div>
            </div>
        </div>
    );
};