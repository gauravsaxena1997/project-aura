/**
 * Particle System Configuration
 * 
 * Centralized configuration for particle rendering, behavior,
 * and visual effects.
 */

// Particle system constants
export const PARTICLE_CONFIG = {
    // Total number of particles in the system
    COUNT: 800,

    // Size of each particle sphere
    DOT_SIZE: 0.015,

    // Grid dimensions for initial particle layout
    GRID_SIZE: 10,

    // Hand interaction radius
    HAND_RADIUS: 2.5
} as const;

// Particle color scheme for different gestures
export const PARTICLE_COLORS = {
    // Dual hand energy sphere - gold
    DUAL_HAND: 0xffaa00,

    // Swipe/wind effect - white
    SWIPE: 0xffffff,

    // Default/idle - cyan (will be overridden by baseColor from voice)
    DEFAULT: 0x00ffff
} as const;

// Particle animation parameters
export const PARTICLE_ANIMATION = {
    // Lerp factor for smooth movement
    LERP_FACTOR: 0.12,

    // Lerp factor during wind effect
    WIND_LERP_FACTOR: 0.05,

    // Lerp factor during dual hand
    DUAL_HAND_LERP_FACTOR: 0.15,

    // Idle wave amplitude
    IDLE_WAVE_AMPLITUDE: 0.1,

    // Dual hand rotation speed
    DUAL_HAND_ROTATION_SPEED: 3.0,

    // Dual hand sphere radius multiplier (relative to hand distance)
    DUAL_HAND_SPHERE_RADIUS: 0.35
} as const;
