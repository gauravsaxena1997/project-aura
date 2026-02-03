import { useState, useCallback, useEffect } from 'react';
import { HandTrackingState } from '../types';

export const useGestureTracker = (
    handStateRef: React.MutableRefObject<HandTrackingState>,
    grabbedObjectId: string | null
) => {
    const [activeGesture, setActiveGesture] = useState<string>('NONE');

    useEffect(() => {
        // Update active gesture based on current state (60fps via animation frame would be better, but this works)
        const interval = setInterval(() => {
            const handState = handStateRef.current;

            // Priority order (highest first)
            if (grabbedObjectId) {
                setActiveGesture(`${grabbedObjectId.toUpperCase()} GRABBED`);
            } else if (handState.isTwoHanded) {
                setActiveGesture('DUAL HAND SYNC');
            } else if (handState.isFist && handState.isPresent) {
                setActiveGesture('GRAVITY WELL');
            } else {
                setActiveGesture('NONE');
            }
        }, 100); // Check 10 times per second

        return () => clearInterval(interval);
    }, [handStateRef, grabbedObjectId]);

    return activeGesture;
};
