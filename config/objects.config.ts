/**
 * Interactive Objects Configuration
 * 
 * Centralized configuration for grabbable 3D objects,
 * including limits, shapes, and interaction parameters.
 */

// Object system limits
export const OBJECT_CONFIG = {
    // Maximum number of objects allowed in scene
    MAX_OBJECTS: 3,

    // Distance threshold for hover detection
    HOVER_DISTANCE: 0.2,

    // Default size for spawned objects
    DEFAULT_SIZE: 0.3
} as const;

// Available object shapes
export const OBJECT_SHAPES = ['box', 'sphere', 'cone', 'torus'] as const;

export type ObjectShape = typeof OBJECT_SHAPES[number];

// Object spawn configuration
export const OBJECT_SPAWN = {
    // Random position range (world units)
    POSITION_RANGE: {
        X: { MIN: -2, MAX: 2 },
        Y: { MIN: -1.5, MAX: 1.5 },
        Z: { MIN: -0.5, MAX: 0.5 }
    },

    // Random rotation range (radians)
    ROTATION_RANGE: {
        MIN: 0,
        MAX: Math.PI * 2
    }
} as const;
