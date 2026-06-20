export const CAROUSEL_CONFIG = {
    // Images from Picsum (High Quality Landscapes)
    IMAGES: [
        "https://picsum.photos/id/10/1600/900", // Forest/Fog
        "https://picsum.photos/id/11/1600/900", // Landscape/Forest
        "https://picsum.photos/id/14/1600/900", // Ocean/Rocks
        "https://picsum.photos/id/17/1600/900", // Grass/Tree
        "https://picsum.photos/id/28/1600/900", // Forest
        "https://picsum.photos/id/29/1600/900", // Mountains
    ],

    // Animation Settings
    ANIMATION_SPEED: 0.5,
    FLOAT_AMPLITUDE: 15, // pixels
    FLOAT_DURATION: 3000, // ms

    // Zoom Limits
    ZOOM_MIN: 0.5,
    ZOOM_MAX: 2.0,
    ZOOM_STEP: 0.2,
    DEFAULT_SCALE: 1.0 as number, // Explicit type to avoid literal inference

    // Interaction
    SWIPE_THRESHOLD: 50, // px velocity (for future phases)
} as const;

