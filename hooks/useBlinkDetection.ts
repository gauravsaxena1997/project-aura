import { useState, useRef, useCallback } from 'react';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';

interface BlinkDetectionConfig {
    earThreshold?: number;
    consecutiveFrames?: number;
    cooldownMs?: number;
}

interface BlinkDetectionResult {
    isBlinking: boolean;
    blinkCount: number;
    leftEAR: number;
    rightEAR: number;
    detectBlink: (faceLandmarks: NormalizedLandmark[]) => void;
    reset: () => void;
}

// Euclidean distance helper
const distance = (p1: NormalizedLandmark, p2: NormalizedLandmark) => {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
};

export const useBlinkDetection = (
    config: BlinkDetectionConfig = {}
): BlinkDetectionResult => {
    const {
        earThreshold = 0.25, // Slightly higher default for easier detection
        consecutiveFrames = 2, // Reactive but filtering noise
        cooldownMs = 300
    } = config;

    const [state, setState] = useState({
        isBlinking: false,
        blinkCount: 0,
        leftEAR: 0,
        rightEAR: 0
    });

    const consecutiveFramesRef = useRef(0);
    const lastBlinkTimeRef = useRef(0);
    const blinkActiveRef = useRef(false); // To ensure we only count once per blink cycle

    const calculateEAR = useCallback((eyeLandmarks: NormalizedLandmark[]) => {
        // EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
        // Indices relative to the eye array passed in (0-5)
        // 0: left point, 3: right point
        // 1: top-left, 2: top-right
        // 5: bottom-left, 4: bottom-right

        const vertical1 = distance(eyeLandmarks[1], eyeLandmarks[5]);
        const vertical2 = distance(eyeLandmarks[2], eyeLandmarks[4]);
        const horizontal = distance(eyeLandmarks[0], eyeLandmarks[3]);

        // Protect against division by zero
        if (horizontal === 0) return 0;

        return (vertical1 + vertical2) / (2.0 * horizontal);
    }, []);

    const detectBlink = useCallback((faceLandmarks: NormalizedLandmark[]) => {
        const now = Date.now();

        // MediaPipe 478 landmarks model indices
        // Left Eye
        const leftEyeIndices = [33, 160, 158, 133, 153, 144];
        // Right Eye
        const rightEyeIndices = [362, 385, 387, 263, 373, 380];

        // Helper to map global indices to landmark objects
        const getLandmarks = (indices: number[]) => indices.map(i => faceLandmarks[i]);

        const leftEye = getLandmarks(leftEyeIndices);
        const rightEye = getLandmarks(rightEyeIndices);

        const leftEAR = calculateEAR(leftEye);
        const rightEAR = calculateEAR(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2.0;

        // Logic
        if (avgEAR < earThreshold) {
            consecutiveFramesRef.current++;
        } else {
            consecutiveFramesRef.current = 0;
            blinkActiveRef.current = false; // Reset active flag when eyes open
        }

        let detectedNow = false;

        if (consecutiveFramesRef.current >= consecutiveFrames && !blinkActiveRef.current) {
            if (now - lastBlinkTimeRef.current > cooldownMs) {
                detectedNow = true;
                lastBlinkTimeRef.current = now;
                blinkActiveRef.current = true; // Mark this blink as "consumed"

                setState(prev => ({
                    ...prev,
                    blinkCount: prev.blinkCount + 1
                }));
            }
        }

        // Update state for UI visualizer
        // Only trigger re-render if values changed significantly or blink state changed
        setState(prev => {
            if (
                Math.abs(prev.leftEAR - leftEAR) > 0.01 ||
                Math.abs(prev.rightEAR - rightEAR) > 0.01 ||
                prev.isBlinking !== detectedNow
            ) {
                return {
                    ...prev,
                    leftEAR,
                    rightEAR,
                    isBlinking: detectedNow || (consecutiveFramesRef.current >= consecutiveFrames) // Visual feedback persists while eyes closed
                };
            }
            return prev;
        });

    }, [earThreshold, consecutiveFrames, cooldownMs, calculateEAR]);

    const reset = useCallback(() => {
        setState(prev => ({ ...prev, blinkCount: 0 }));
    }, []);

    return {
        ...state,
        detectBlink,
        reset
    };
};
