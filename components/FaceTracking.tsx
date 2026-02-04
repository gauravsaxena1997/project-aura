import React, { useEffect, useRef } from 'react';
import { MediaPipeFaceService } from '../services/mediapipeFaceService';
import { useBlinkDetection } from '../hooks/useBlinkDetection';
import { FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { CLICK_CONFIG } from '../config/click.config';

interface FaceTrackingProps {
    videoElement: HTMLVideoElement | null;
    onBlink: () => void;
    enabled?: boolean;
}

export const FaceTracking: React.FC<FaceTrackingProps> = ({
    videoElement,
    onBlink,
    enabled = true
}) => {
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const requestRef = useRef<number>(0);
    const lastVideoTimeRef = useRef<number>(-1);

    const { detectBlink, leftEAR, rightEAR, isBlinking } = useBlinkDetection({
        earThreshold: CLICK_CONFIG.EAR_THRESHOLD,
        consecutiveFrames: CLICK_CONFIG.BLINK_CONSECUTIVE_FRAMES,
        cooldownMs: CLICK_CONFIG.CLICK_COOLDOWN_MS
    });

    // Initialize MediaPipe
    useEffect(() => {
        const init = async () => {
            try {
                const landmarker = await MediaPipeFaceService.getInstance();
                faceLandmarkerRef.current = landmarker;
            } catch (error) {
                console.error("Critical: FaceTracking failed to load", error);
            }
        };
        init();
    }, []);

    // Frame Loop
    useEffect(() => {
        const processFrame = () => {
            if (
                enabled &&
                faceLandmarkerRef.current &&
                videoElement &&
                videoElement.readyState >= 2 &&
                !videoElement.paused &&
                !videoElement.ended
            ) {
                // Only process if video time has advanced
                if (videoElement.currentTime !== lastVideoTimeRef.current) {
                    lastVideoTimeRef.current = videoElement.currentTime;

                    const startTimeMs = performance.now();
                    const results: FaceLandmarkerResult = faceLandmarkerRef.current.detectForVideo(videoElement, startTimeMs);

                    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                        const face = results.faceLandmarks[0];
                        detectBlink(face);
                    }
                }
            }
            requestRef.current = requestAnimationFrame(processFrame);
        };

        if (enabled) {
            processFrame();
        }

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [enabled, videoElement, detectBlink]);

    // Handle Blink Effect
    useEffect(() => {
        // We use a ref to prevent stale closures if onBlink changes, 
        // though onBlink should be stable from parent.
        if (isBlinking) {
            onBlink();
        }
    }, [isBlinking, onBlink]);

    // Debug Overlay (Optional - Remove in prod or control via config)
    if (!CLICK_CONFIG.DEBUG_MODE) return null;

    return (
        <div className="absolute top-20 right-4 bg-black/50 text-white text-[10px] p-2 rounded z-[100] pointer-events-none fade-in">
            <p className="font-bold">FACE DEBUG</p>
            <p>L EAR: {leftEAR.toFixed(3)}</p>
            <p>R EAR: {rightEAR.toFixed(3)}</p>
            <p className={isBlinking ? "text-green-400 font-bold" : "text-gray-400"}>
                BLINK: {isBlinking ? "DETECTED" : "NO"}
            </p>
        </div>
    );
};
