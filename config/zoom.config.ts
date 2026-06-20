export const ZOOM_CONFIG = {
    // Zoom Limits
    MIN_SCALE: 0.5,
    MAX_SCALE: 2.5,

    // Two-Hand Detection
    MIN_HAND_DISTANCE: 0.15, // Minimum distance between hands to activate zoom (normalized 0-1)

    // Smoothing (optional - can add later if needed)
    SMOOTHING_FACTOR: 0.15, // For lerping if we want smoother transitions
} as const;
