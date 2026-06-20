import { useRef, useCallback } from 'react';
import { HandTrackingState } from '../types';
import { ZOOM_CONFIG } from '../config/zoom.config';

interface TwoHandZoomResult {
    scale: number | null; // Calculated scale based on hand distance, null if not active
    isActive: boolean;    // Whether two-hand zoom is currently active
    debugDistance: number; // Current hand distance for debugging
}

export const useZoomGesture = () => {
    const baseDistanceRef = useRef<number | null>(null);
    const baseScaleRef = useRef<number>(1.0);
    const isActiveRef = useRef<boolean>(false);

    const processHandFrame = useCallback((
        handState: HandTrackingState,
        currentScale: number
    ): TwoHandZoomResult => {

        // Check if two hands are present and sufficiently separated
        if (!handState.isTwoHanded || handState.handDistance < ZOOM_CONFIG.MIN_HAND_DISTANCE) {
            // Gesture ended - lock in the current scale
            if (isActiveRef.current) {
                baseScaleRef.current = currentScale;
                baseDistanceRef.current = null;
                isActiveRef.current = false;
            }

            return {
                scale: null,
                isActive: false,
                debugDistance: handState.handDistance
            };
        }

        // Two hands detected with sufficient distance
        const currentDistance = handState.handDistance;

        // Initialize gesture (first frame of two-hand detection)
        if (!isActiveRef.current) {
            baseDistanceRef.current = currentDistance;
            baseScaleRef.current = currentScale;
            isActiveRef.current = true;

            return {
                scale: currentScale, // Keep current scale on first frame
                isActive: true,
                debugDistance: currentDistance
            };
        }

        // Calculate zoom ratio based on distance change
        const distanceRatio = currentDistance / (baseDistanceRef.current || currentDistance);
        const newScale = baseScaleRef.current * distanceRatio;

        // Clamp to min/max
        const clampedScale = Math.min(
            Math.max(newScale, ZOOM_CONFIG.MIN_SCALE),
            ZOOM_CONFIG.MAX_SCALE
        );

        return {
            scale: clampedScale,
            isActive: true,
            debugDistance: currentDistance
        };

    }, []);

    return { processHandFrame };
};
