import React, { useState, useEffect, useRef } from 'react';
import { CAROUSEL_CONFIG } from '../config/carousel.config';
import { useZoomGesture } from '../hooks/useZoomGesture';
import { HandTrackingState, ClickState } from '../types';

interface InformationCarouselProps {
    isVisible: boolean;
    onClose: () => void;
    handStateRef: React.MutableRefObject<HandTrackingState>;
    clickState: ClickState;
}

export const InformationCarousel: React.FC<InformationCarouselProps> = ({
    isVisible,
    onClose,
    handStateRef,
    clickState
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [scale, setScale] = useState<number>(CAROUSEL_CONFIG.DEFAULT_SCALE);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [direction, setDirection] = useState<'left' | 'right' | null>(null);
    const [activeButton, setActiveButton] = useState<'next' | 'prev' | null>(null);

    // Virtual Cursor State
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [hoveredElement, setHoveredElement] = useState<string | null>(null);
    const lastProcessedClickTime = useRef<number>(0);

    // Refs for Interactive Elements (Hit Testing)
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const resetBtnRef = useRef<HTMLButtonElement>(null);
    const nextBtnRef = useRef<HTMLButtonElement>(null);
    const prevBtnRef = useRef<HTMLButtonElement>(null);
    const zoomInBtnRef = useRef<HTMLButtonElement>(null);
    const zoomOutBtnRef = useRef<HTMLButtonElement>(null);

    // Zoom Gesture Hook
    const { processHandFrame } = useZoomGesture();
    const requestRef = useRef<number>(0);
    const [gestureFeedback, setGestureFeedback] = useState<'zoomin' | 'zoomout' | null>(null);
    const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset state when opened
    useEffect(() => {
        if (isVisible) {
            setCurrentIndex(0);
            setScale(CAROUSEL_CONFIG.DEFAULT_SCALE);
            setDirection(null);
        }
    }, [isVisible]);

    // Handle Click Events (Blink/Tap)
    useEffect(() => {
        // Only process NEW clicks
        if (clickState.lastClickTime > lastProcessedClickTime.current) {
            lastProcessedClickTime.current = clickState.lastClickTime;

            if (hoveredElement) {
                console.log(`[Carousel] Click triggered on: ${hoveredElement}`);
                // Trigger action based on hovered element ID
                if (hoveredElement === 'close') onClose();
                if (hoveredElement === 'reset') handleResetZoom();
                if (hoveredElement === 'next') handleNext();
                if (hoveredElement === 'prev') handlePrev();
                if (hoveredElement === 'zoomMainIn') handleZoomIn();
                if (hoveredElement === 'zoomMainOut') handleZoomOut();
            }
        }
    }, [clickState, hoveredElement, onClose]);

    // Helper: Simple AABB Collision Detection
    const checkCollision = (cursorX: number, cursorY: number, ref: React.RefObject<HTMLButtonElement>, id: string): boolean => {
        if (!ref.current) return false;
        const rect = ref.current.getBoundingClientRect();

        // Simple rectangular check
        return (
            cursorX >= rect.left &&
            cursorX <= rect.right &&
            cursorY >= rect.top &&
            cursorY <= rect.bottom
        );
    };

    // GESTURE PROCESSING LOOP - Continuous Two-Hand Zoom & Cursor
    useEffect(() => {
        if (!isVisible) return;

        const updateLoop = () => {
            const handState = handStateRef.current;
            const { scale: gestureScale, isActive, debugDistance } = processHandFrame(handState, scale);

            // 1. UPDATE SCALE (Gesture)
            if (isActive && gestureScale !== null) {
                setScale(gestureScale);
                setGestureFeedback('zoomin');
            } else {
                setGestureFeedback(null);
            }

            // 2. SWIPE NAVIGATION CHECK
            if (handState.swipeDirection !== 'none') {
                if (handState.swipeDirection === 'left') handleNext();
                else if (handState.swipeDirection === 'right') handlePrev();
            }

            // 3. VIRTUAL CURSOR (Index Finger)
            if (handState.isPresent && handState.indexTip) {
                // Map MediaPipe (0-1) to Screen Coordinates
                // Standard mapping: x=0 (left) -> x=1 (right)
                // Note: If video is mirrored, we might need (1 - x). 
                // Let's assume standard first, but if user says cursor is inverted, we flip.
                // Usually for user-facing camera, mirroring is good for "mirror" feel.
                // If the VIDEO is mirrored (transform: scaleX(-1)), then the HAND coordinates from MediaPipe 
                // match the mirrored image. So moving hand RIGHT (your right) moves image hand RIGHT (screen right).
                // MediaPipe x coordinates go 0 (left) to 1 (right).
                // So simple mapping should work if CSS mirrors the video.

                // Map MediaPipe (0-1) to Screen Coordinates with AMPLIFICATION
                const SENSITIVITY = 2.2; // Amplification factor (1.0 = 1:1, 2.2 = easier reach)

                // 1. Get raw normalized coordinates (0-1)
                // Mirror X because it's a "mirror" reflection
                const rawX = 1 - handState.indexTip.x;
                const rawY = handState.indexTip.y;

                // 2. Amplify movement around the center (0.5, 0.5)
                // Formula: (value - center) * sensitivity + center
                let normX = (rawX - 0.5) * SENSITIVITY + 0.5;
                let normY = (rawY - 0.5) * SENSITIVITY + 0.5;

                // 3. Clamp to screen edges (0-1) to prevent cursor flying off infinitely
                normX = Math.max(0, Math.min(1, normX));
                normY = Math.max(0, Math.min(1, normY));

                const screenX = normX * window.innerWidth;
                const screenY = normY * window.innerHeight;

                setCursorPos({ x: screenX, y: screenY });

                // Hit Testing
                let hitId: string | null = null;

                if (checkCollision(screenX, screenY, closeBtnRef, 'close')) hitId = 'close';
                else if (checkCollision(screenX, screenY, resetBtnRef, 'reset')) hitId = 'reset';
                else if (checkCollision(screenX, screenY, nextBtnRef, 'next')) hitId = 'next';
                else if (checkCollision(screenX, screenY, prevBtnRef, 'prev')) hitId = 'prev';
                else if (checkCollision(screenX, screenY, zoomInBtnRef, 'zoomMainIn')) hitId = 'zoomMainIn';
                else if (checkCollision(screenX, screenY, zoomOutBtnRef, 'zoomMainOut')) hitId = 'zoomMainOut';

                setHoveredElement(hitId);
            } else {
                setHoveredElement(null); // No hand = no hover
            }

            // Store debug info
            (window as any).__zoomDebug = {
                distance: debugDistance,
                isActive: isActive,
                currentScale: scale,
                hover: hoveredElement
            };

            requestRef.current = requestAnimationFrame(updateLoop);
        };

        requestRef.current = requestAnimationFrame(updateLoop);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        };
    }, [isVisible, processHandFrame, handStateRef, scale]);


    if (!isVisible) return null;

    const handleNext = () => {
        if (isTransitioning) return;
        setDirection('left');
        setIsTransitioning(true);
        setActiveButton('next');

        setTimeout(() => setActiveButton(null), 200);

        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % CAROUSEL_CONFIG.IMAGES.length);
            setIsTransitioning(false);
        }, 300);
    };

    const handlePrev = () => {
        if (isTransitioning) return;
        setDirection('right');
        setIsTransitioning(true);
        setActiveButton('prev');

        setTimeout(() => setActiveButton(null), 200);

        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + CAROUSEL_CONFIG.IMAGES.length) % CAROUSEL_CONFIG.IMAGES.length);
            setIsTransitioning(false);
        }, 300);
    };

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + CAROUSEL_CONFIG.ZOOM_STEP, CAROUSEL_CONFIG.ZOOM_MAX));
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - CAROUSEL_CONFIG.ZOOM_STEP, CAROUSEL_CONFIG.ZOOM_MIN));
    };

    const handleResetZoom = () => {
        setScale(CAROUSEL_CONFIG.DEFAULT_SCALE);
    };

    const getTransformClass = () => {
        if (!isTransitioning) return 'translate-x-0 opacity-100 scale-100 blur-0';
        if (direction === 'left') return '-translate-x-[120%] opacity-0 scale-95 blur-sm rotate-y-12';
        if (direction === 'right') return 'translate-x-[120%] opacity-0 scale-95 blur-sm -rotate-y-12';
        return '';
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in text-white selection:bg-transparent overflow-hidden cursor-none">

            {/* --- VIRTUAL CURSOR --- */}
            <div
                className={`fixed pointer-events-none z-[100] transition-transform duration-75 ease-out flex items-center justify-center
                    ${hoveredElement ? 'scale-150' : 'scale-100'}`}
                style={{
                    left: 0,
                    top: 0,
                    transform: `translate(${cursorPos.x}px, ${cursorPos.y}px)`
                }}
            >
                {/* Cursor Ring */}
                <div className={`w-8 h-8 rounded-full border-2 transition-colors duration-200 
                    ${hoveredElement ? 'border-cyan-400 bg-cyan-400/20' : 'border-white/50'}`}></div>

                {/* Center Dot */}
                <div className="absolute w-1 h-1 bg-white rounded-full"></div>

                {/* Connector Line (optional visual flair) */}
                {hoveredElement && (
                    <div className="absolute top-full mt-2 text-[10px] font-mono text-cyan-400 tracking-widest uppercase">
                        CLICK
                    </div>
                )}
            </div>

            {/* --- GESTURE FEEDBACK OVERLAY --- */}
            {gestureFeedback && (
                <div className="absolute top-24 pointer-events-none z-50 animate-pulse bg-cyan-500/20 px-4 py-1 rounded-full border border-cyan-400/30 text-cyan-200 text-sm font-mono tracking-widest">
                    TWO-HAND ZOOM ACTIVE
                </div>
            )}

            {/* --- DEBUG OVERLAY --- */}
            <div className="absolute top-32 left-8 pointer-events-none z-50 bg-black/60 px-3 py-2 rounded text-xs font-mono text-white/80 space-y-1">
                <div>Hand Distance: {((window as any).__zoomDebug?.distance || 0).toFixed(3)}</div>
                <div>Active: {(window as any).__zoomDebug?.isActive ? '✅ YES' : '❌ NO'}</div>
                <div>Scale: {((window as any).__zoomDebug?.currentScale || 1).toFixed(2)}x</div>
                <div className="text-yellow-400">Two hands apart = Zoom In</div>
                <div className="text-cyan-400">Hover: {hoveredElement || 'None'}</div>
            </div>

            {/* --- TOP CONTROLS --- */}
            <div className="absolute top-8 right-8 flex gap-4 z-50 pointer-events-auto">
                {/* Reset Button */}
                <button
                    ref={resetBtnRef}
                    onClick={handleResetZoom}
                    className={`group relative flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-300
                        ${hoveredElement === 'reset' ? 'bg-white/20 border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-white/20 hover:bg-white/10'}`}
                    title="Reset Size"
                >
                    <span className="material-symbols-outlined text-white/70 group-hover:text-white">restart_alt</span>
                </button>

                {/* Close Button */}
                <button
                    ref={closeBtnRef}
                    onClick={onClose}
                    className={`group relative flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-300
                        ${hoveredElement === 'close' ? 'bg-red-500/40 border-red-400 scale-110 shadow-[0_0_15px_rgba(248,113,113,0.5)]' : 'border-red-500/50 hover:bg-red-500/20'}`}
                    title="Close"
                >
                    <span className="material-symbols-outlined text-red-400 group-hover:text-red-200">close</span>
                </button>
            </div>

            {/* --- NAVIGATION (EDGES) --- */}
            {/* Left Control Area */}
            <div className="absolute left-0 top-0 bottom-0 w-24 flex items-center justify-center z-40 pointer-events-none">
                <button
                    ref={prevBtnRef}
                    onClick={handlePrev}
                    className={`w-16 h-16 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer pointer-events-auto 
                        ${activeButton === 'prev' || hoveredElement === 'prev' ? 'bg-cyan-500/40 scale-95 shadow-[0_0_20px_rgba(34,211,238,0.5)]' : 'hover:bg-white/10 active:scale-95'}`}
                >
                    <span className={`material-symbols-outlined text-5xl transition-all duration-200 ${activeButton === 'prev' || hoveredElement === 'prev' ? 'text-cyan-200 opacity-100' : 'opacity-50 hover:opacity-100'}`}>chevron_left</span>
                </button>
            </div>

            {/* Right Control Area */}
            <div className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-center z-40 pointer-events-none">
                <button
                    ref={nextBtnRef}
                    onClick={handleNext}
                    className={`w-16 h-16 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer pointer-events-auto 
                        ${activeButton === 'next' || hoveredElement === 'next' ? 'bg-cyan-500/40 scale-95 shadow-[0_0_20px_rgba(34,211,238,0.5)]' : 'hover:bg-white/10 active:scale-95'}`}
                >
                    <span className={`material-symbols-outlined text-5xl transition-all duration-200 ${activeButton === 'next' || hoveredElement === 'next' ? 'text-cyan-200 opacity-100' : 'opacity-50 hover:opacity-100'}`}>chevron_right</span>
                </button>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="relative w-full h-full flex items-center justify-center perspective-1000 p-24">

                {/* 3D Floating Image Container */}
                <div
                    className={`relative transform-style-3d ${getTransformClass()}`}
                    style={{
                        transform: !isTransitioning ? `scale(${scale})` : undefined,
                        animation: !isTransitioning ? 'float 6s ease-in-out infinite' : 'none',
                        maxWidth: '80%',
                        maxHeight: '80%',
                        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 rounded-xl blur-xl -z-10"></div>
                    <img
                        src={CAROUSEL_CONFIG.IMAGES[currentIndex]}
                        alt="Carousel Slide"
                        key={currentIndex}
                        className="w-auto h-auto max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl border border-white/10 animate-slide-in"
                        style={{
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                    />

                    {/* Scale Indicator */}
                    <div className="absolute bottom-4 right-4 bg-black/60 px-2 py-1 rounded text-xs text-white/70 font-mono">
                        {(scale * 100).toFixed(0)}%
                    </div>
                </div>
            </div>

            {/* --- BOTTOM CONTROLS --- */}
            <div className="absolute bottom-10 flex gap-4 pointer-events-auto z-40">
                <button
                    ref={zoomOutBtnRef}
                    onClick={handleZoomOut}
                    className={`px-6 py-2 rounded-full border border-white/10 transition-all flex items-center gap-2
                        ${gestureFeedback === 'zoomout' || hoveredElement === 'zoomMainOut' ? 'bg-cyan-500/40 scale-95 border-cyan-400' : 'bg-white/10 hover:bg-white/20'}`}
                    disabled={scale <= CAROUSEL_CONFIG.ZOOM_MIN}
                >
                    <span className="material-symbols-outlined text-sm">remove</span> Zoom Out
                </button>

                {/* Indicators */}
                <div className="flex items-center gap-2 mx-4">
                    {CAROUSEL_CONFIG.IMAGES.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-cyan-400 w-4' : 'bg-white/20'}`}
                        />
                    ))}
                </div>

                <button
                    ref={zoomInBtnRef}
                    onClick={handleZoomIn}
                    className={`px-6 py-2 rounded-full border border-white/10 transition-all flex items-center gap-2
                        ${gestureFeedback === 'zoomin' || hoveredElement === 'zoomMainIn' ? 'bg-cyan-500/40 scale-95 border-cyan-400' : 'bg-white/10 hover:bg-white/20'}`}
                    disabled={scale >= CAROUSEL_CONFIG.ZOOM_MAX}
                >
                    Zoom In <span className="material-symbols-outlined text-sm">add</span>
                </button>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: scale(${scale}); }
                    50% { transform: translateY(-${CAROUSEL_CONFIG.FLOAT_AMPLITUDE}px) scale(${scale}); }
                }
                @keyframes slide-in {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s ease-out forwards;
                }
                .perspective-1000 { perspective: 1000px; }
                .rotate-y-12 { transform: rotateY(12deg); }
                .-rotate-y-12 { transform: rotateY(-12deg); }
            `}</style>
        </div>
    );
};
