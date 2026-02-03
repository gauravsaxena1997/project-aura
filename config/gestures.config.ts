/**
 * Gesture Configuration
 * 
 * Centralized configuration for all gesture types, detection thresholds,
 * and priority levels following the Single Responsibility Principle.
 */

// Gesture type constants
export const GESTURE_TYPES = {
    GRAB: 'grab',
    FIST: 'fist',
    DUAL_HAND: 'dual_hand',
    SWIPE: 'swipe',
    PINCH: 'pinch',
    MOVE: 'move',
    IDLE: 'idle'
} as const;

// Type derived from GESTURE_TYPES
export type GestureType = typeof GESTURE_TYPES[keyof typeof GESTURE_TYPES];

// Detection thresholds for hand tracking
export const GESTURE_THRESHOLDS = {
    // Pinch detection: distance between thumb and index finger
    PINCH_DISTANCE: 0.05,

    // Fist detection: distance between index finger and wrist
    FIST_DISTANCE: 0.15,

    // Swipe detection: minimum distance traveled
    SWIPE_DISTANCE: 0.08,

    // Swipe detection: maximum time window (ms)
    SWIPE_TIME_MS: 300,

    // Object hover detection: distance from hand to object
    HOVER_DISTANCE: 0.2
} as const;

// Gesture priority levels (higher = more important)
// CRITICAL: This is the core of the priority system
export const GESTURE_PRIORITY: Record<string, number> = {
    GRAB: 100,        // Highest priority - object manipulation
    DUAL_HAND: 50,    // Medium priority - energy sphere
    FIST: 30,         // Lower priority - gravity well
    SWIPE: 20,        // Lower priority - particle wind
    MOVE: 10,         // Lowest priority - cursor tracking
    IDLE: 0           // No gesture active
};

// Gesture display names for UI
export const GESTURE_DISPLAY_NAMES: Record<GestureType, string> = {
    grab: 'OBJECT GRABBED',
    dual_hand: 'DUAL HAND SYNC',
    fist: 'GRAVITY WELL',
    swipe: 'PARTICLE WIND',
    pinch: 'PINCH SELECT',
    move: 'CURSOR TRACKING',
    idle: 'NONE'
};

// Gesture event names for logging
export const GESTURE_EVENTS: Record<GestureType, string> = {
    grab: 'GRAB',
    dual_hand: 'DUAL HAND SYNC',
    fist: 'GRAVITY WELL',
    swipe: 'FLICK',
    pinch: 'PINCH SELECT',
    move: 'MOVE',
    idle: 'IDLE'
};
