import React, { useEffect, useRef } from 'react';
import { MediaPipeService } from '../services/mediapipeService';
import { HandTrackingState, HandLandmarkResult } from '../types';

interface VideoBackgroundProps {
    handStateRef: React.MutableRefObject<HandTrackingState>;
    onGesture: (gesture: string) => void;
    onVideoReady?: (video: HTMLVideoElement) => void;
}

export const VideoBackground: React.FC<VideoBackgroundProps> = ({ handStateRef, onGesture, onVideoReady }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const requestRef = useRef<number>(0);
    const isProcessing = useRef<boolean>(false);

    // Logic Refs
    const swipeCooldown = useRef<boolean>(false);
    const wasPinching = useRef<boolean>(false);
    const prevTapRef = useRef<boolean>(false); // Used in aura3d for logic, but here we track state
    const wasFist = useRef<boolean>(false);
    const wasTwoHanded = useRef<boolean>(false);

    // History buffer for smooth velocity calculation
    const wristHistory = useRef<{ x: number, time: number }[]>([]);

    useEffect(() => {
        let hands: any = null;

        const onResults = (results: any) => {
            isProcessing.current = false;
            const res = results as HandLandmarkResult;
            const now = Date.now();

            // Default: Reset
            let currentSwipeDir: 'left' | 'right' | 'none' = 'none';

            if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
                // --- DATA EXTRACTION ---
                const hand1 = res.multiHandLandmarks[0];
                const hand2 = res.multiHandLandmarks.length > 1 ? res.multiHandLandmarks[1] : null;

                // Primary Hand (Hand 1)
                const wrist = hand1[0];
                const thumbTip = hand1[4];
                const indexTip = hand1[8];

                // --- 1. DUAL HAND LOGIC (ENERGY SPHERE) ---
                // NOTE: Priority is now handled by useGesturePriority hook in App.tsx
                // This component just detects hand state, doesn't enforce priority
                let isTwoHanded = false;
                let handDistance = 0;
                let centerPoint = null;

                if (hand2) {
                    isTwoHanded = true;
                    const wrist2 = hand2[0];

                    // Calculate distance between wrists
                    handDistance = Math.hypot(wrist.x - wrist2.x, wrist.y - wrist2.y);

                    // Calculate center point
                    centerPoint = {
                        x: (wrist.x + wrist2.x) / 2,
                        y: (wrist.y + wrist2.y) / 2
                    };

                    if (!wasTwoHanded.current) onGesture("DUAL HAND SYNC");
                }
                wasTwoHanded.current = isTwoHanded;

                // --- 2. SINGLE HAND GESTURES ---
                const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
                const isPinching = pinchDist < 0.05; // Tip-to-Tip (Grab)

                // NEW: Tap Gesture (Thumb to Index Side - Contact Zone)
                // Check distance to multiple points along the index finger
                const indexMCP = hand1[5]; // Base knuckle
                const indexPIP = hand1[6]; // Middle joint
                const indexDIP = hand1[7]; // Upper joint

                const distToMCP = Math.hypot(indexMCP.x - thumbTip.x, indexMCP.y - thumbTip.y);
                const distToPIP = Math.hypot(indexPIP.x - thumbTip.x, indexPIP.y - thumbTip.y);
                const distToDIP = Math.hypot(indexDIP.x - thumbTip.x, indexDIP.y - thumbTip.y);

                // Find closest point of contact
                const minTapDist = Math.min(distToMCP, distToPIP, distToDIP);

                // Allow tap if close enough to ANY point on side, but NOT if pinching (grabbing)
                // Threshold 0.06 allows for "side" contact which is further than "center" contact
                const isTapping = minTapDist < 0.06 && !isPinching;

                const fingerDist = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
                const isFist = fingerDist < 0.15;

                // --- 3. FLICK (SWIPE) LOGIC ---
                // Only detect flick if using one hand (to avoid confusion)
                if (!isTwoHanded) {
                    wristHistory.current.push({ x: wrist.x, time: now });
                    if (wristHistory.current.length > 5) wristHistory.current.shift();

                    if (!swipeCooldown.current && wristHistory.current.length === 5) {
                        const start = wristHistory.current[0];
                        const end = wristHistory.current[4];
                        const dt = end.time - start.time;
                        const dx = end.x - start.x;

                        // TUNING: Relaxed thresholds
                        // Distance > 0.08 (8% of screen)
                        // Time < 300ms
                        if (dt < 300 && Math.abs(dx) > 0.08) {
                            if (dx > 0) {
                                currentSwipeDir = 'left'; // Mirror logic handled in consumer
                                onGesture('FLICK LEFT <<');
                            } else {
                                currentSwipeDir = 'right';
                                onGesture('>> FLICK RIGHT');
                            }

                            swipeCooldown.current = true;
                            setTimeout(() => { swipeCooldown.current = false; }, 500);
                            wristHistory.current = [];
                        }
                    }
                }

                // --- UPDATE STATE ---
                handStateRef.current = {
                    indexTip,
                    thumbTip,
                    wrist,
                    isPinching,
                    isTapping, // Add new state
                    isFist,
                    isTwoHanded,
                    handDistance,
                    centerPoint,
                    isPresent: true,
                    swipeDirection: currentSwipeDir
                };

                // Callbacks
                if (isPinching && !wasPinching.current) onGesture('PINCH SELECT');
                if (isFist && !wasFist.current) onGesture('GRAVITY WELL');

                wasPinching.current = isPinching;
                wasFist.current = isFist;

            } else {
                handStateRef.current.isPresent = false;
                handStateRef.current.isTwoHanded = false;
                wristHistory.current = [];
            }
        };

        const processFrame = async () => {
            if (!videoRef.current || !hands) return;
            if (!isProcessing.current && videoRef.current.readyState === 4) {
                isProcessing.current = true;
                try {
                    await hands.send({ image: videoRef.current });
                } catch (e) {
                    isProcessing.current = false;
                }
            }
            requestRef.current = requestAnimationFrame(processFrame);
        };

        const startCamera = async () => {
            if (!videoRef.current) return;

            try {
                hands = MediaPipeService.getInstance();
                hands.onResults(onResults);

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720, facingMode: 'user' }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadeddata = () => {
                        videoRef.current?.play();
                        processFrame();

                        // NEW callback call
                        if (onVideoReady && videoRef.current) {
                            onVideoReady(videoRef.current);
                        }
                    };
                }
            } catch (err) {
                console.error(err);
                onGesture("ERROR: CAM_FAIL");
            }
        };

        startCamera();

        return () => {
            cancelAnimationFrame(requestRef.current);
            if (videoRef.current?.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            }
        };
    }, [handStateRef, onGesture, onVideoReady]);

    return (
        <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover filter brightness-50 contrast-125 grayscale"
            style={{ transform: 'scaleX(-1)' }}
            playsInline
            muted
        />
    );
};