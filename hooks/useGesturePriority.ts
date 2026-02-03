/**
 * useGesturePriority Hook
 * 
 * CRITICAL: This is the single source of truth for gesture priority decisions.
 * 
 * This hook centralizes all gesture priority logic, ensuring that higher-priority
 * gestures (like object grab) cannot be overridden by lower-priority gestures
 * (like dual hand sync).
 * 
 * Priority Order (highest to lowest):
 * 1. GRAB (100) - Object manipulation
 * 2. DUAL_HAND (50) - Energy sphere
 * 3. FIST (30) - Gravity well
 * 4. SWIPE (20) - Particle wind
 * 5. MOVE (10) - Cursor tracking
 * 6. IDLE (0) - No gesture
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { HandTrackingState } from '../types';
import { GestureType, GesturePriorityState } from '../types/gestures.types';
import { GESTURE_TYPES, GESTURE_PRIORITY } from '../config/gestures.config';

export const useGesturePriority = (
    handStateRef: React.MutableRefObject<HandTrackingState>,
    grabbedObjectId: string | null
): GesturePriorityState => {
    const [activeGesture, setActiveGesture] = useState<GestureType>(GESTURE_TYPES.IDLE);
    const [gesturePriority, setGesturePriority] = useState<number>(GESTURE_PRIORITY.IDLE);

    // Track previous gesture for transition detection
    const prevGestureRef = useRef<GestureType>(GESTURE_TYPES.IDLE);

    /**
     * Check if a requested gesture should be allowed based on current priority
     */
    const shouldAllowGesture = useCallback((requestedGesture: GestureType): boolean => {
        const requestedPriority = GESTURE_PRIORITY[requestedGesture.toUpperCase() as keyof typeof GESTURE_PRIORITY];

        // Allow if requested priority is higher than or equal to current
        return requestedPriority >= gesturePriority;
    }, [gesturePriority]);

    /**
     * Update active gesture based on hand state and grabbed object
     * This runs on every state change to determine the highest priority gesture
     */
    useEffect(() => {
        const handState = handStateRef.current;
        let newGesture: GestureType = GESTURE_TYPES.IDLE;
        let newPriority = GESTURE_PRIORITY.IDLE;

        // Priority check order (highest first)
        // 1. GRAB - Highest priority, blocks all other gestures
        if (grabbedObjectId) {
            newGesture = GESTURE_TYPES.GRAB;
            newPriority = GESTURE_PRIORITY.GRAB;
        }
        // 2. DUAL_HAND - Only if not grabbing
        else if (handState.isTwoHanded && shouldAllowGesture(GESTURE_TYPES.DUAL_HAND)) {
            newGesture = GESTURE_TYPES.DUAL_HAND;
            newPriority = GESTURE_PRIORITY.DUAL_HAND;
        }
        // 3. FIST - Only if not grabbing or dual hand
        else if (handState.isFist && handState.isPresent && shouldAllowGesture(GESTURE_TYPES.FIST)) {
            newGesture = GESTURE_TYPES.FIST;
            newPriority = GESTURE_PRIORITY.FIST;
        }
        // 4. SWIPE - Detected via swipeDirection
        else if (handState.swipeDirection !== 'none' && shouldAllowGesture(GESTURE_TYPES.SWIPE)) {
            newGesture = GESTURE_TYPES.SWIPE;
            newPriority = GESTURE_PRIORITY.SWIPE;
        }
        // 5. MOVE - Hand is present but no specific gesture
        else if (handState.isPresent && shouldAllowGesture(GESTURE_TYPES.MOVE)) {
            newGesture = GESTURE_TYPES.MOVE;
            newPriority = GESTURE_PRIORITY.MOVE;
        }
        // 6. IDLE - Default state
        else {
            newGesture = GESTURE_TYPES.IDLE;
            newPriority = GESTURE_PRIORITY.IDLE;
        }

        // Only update if gesture changed
        if (newGesture !== prevGestureRef.current) {
            console.log(`[Priority] Gesture changed: ${prevGestureRef.current} → ${newGesture} (priority: ${newPriority})`);
            setActiveGesture(newGesture);
            setGesturePriority(newPriority);
            prevGestureRef.current = newGesture;
        }
    }, [handStateRef, grabbedObjectId, shouldAllowGesture]);

    return {
        activeGesture,
        priority: gesturePriority,
        shouldAllowGesture
    };
};
