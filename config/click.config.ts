/**
 * Click Detection Configuration
 * 
 * Centralized configuration for click detection thresholds,
 * cooldowns, and behavior settings.
 */

export const CLICK_CONFIG = {
    // Pinch detection
    PINCH_THRESHOLD: 0.05, // Distance threshold for pinch

    // Blink detection (Sensitive for rapid blinks)
    EAR_THRESHOLD: 0.25, // Increased from 0.2 for easier triggering
    BLINK_CONSECUTIVE_FRAMES: 1, // Reduced from 3 to detect quick blinks (single-frame)

    // Cooldown
    CLICK_COOLDOWN_MS: 300, // Minimum time between clicks (global)

    // Visual feedback
    FEEDBACK_DURATION_MS: 2000, // How long to show click message

    // Face tracking 
    FACE_DETECTION_CONFIDENCE: 0.5, // Reduced slightly to ensure it doesn't drop during fast motion
    FACE_TRACKING_CONFIDENCE: 0.5,

    // Debug
    DEBUG_MODE: false, // Show EAR values in HUD
} as const;

/**
 * Interaction Methods Registry
 * Defines all available ways to click/interact with the system
 */
export const INTERACTION_METHODS = {
    TAP: {
        id: 'tap',
        label: 'Thumb Tap',
        description: 'Tap thumb against index finger side',
        enabled: true,
        cooldownMs: 300
    },
    BLINK: {
        id: 'blink',
        label: 'Eye Blink',
        description: 'Blink both eyes firmly',
        enabled: true,
        cooldownMs: 500 // Reduced from 800 for faster responsiveness
    }
} as const;

export type ClickSource = keyof typeof INTERACTION_METHODS extends string ? Lowercase<keyof typeof INTERACTION_METHODS> : never;
// Explicitly mapping for TS safety if needed, though strict keyof is better.
// Actually, let's keep it simple and aligned with the IDs
export type InteractionType = typeof INTERACTION_METHODS[keyof typeof INTERACTION_METHODS]['id'];

export interface ClickEvent {
    source: InteractionType;
    timestamp: number;
    count: number;
}
