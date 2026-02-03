/**
 * Gesture Type Definitions
 * 
 * TypeScript types for gesture system, priority management,
 * and state tracking.
 */

import { GESTURE_TYPES } from '../config/gestures.config';

// Gesture type derived from config
export type GestureType = typeof GESTURE_TYPES[keyof typeof GESTURE_TYPES];

// Gesture priority state returned by useGesturePriority hook
export interface GesturePriorityState {
    // Currently active gesture
    activeGesture: GestureType;

    // Current priority level
    priority: number;

    // Function to check if a gesture should be allowed
    shouldAllowGesture: (gesture: GestureType) => boolean;
}

// Gesture event for logging and UI updates
export interface GestureEvent {
    type: GestureType;
    timestamp: number;
    priority: number;
}
