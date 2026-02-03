import React, { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HandTrackingState } from '../types';
import { GestureType } from '../types/gestures.types';
import { PARTICLE_CONFIG, PARTICLE_COLORS, PARTICLE_ANIMATION } from '../config/particles.config';

interface ParticlesProps {
    handStateRef: React.MutableRefObject<HandTrackingState>;
    baseColor: string;
    activeGesture: GestureType;
}

/**
 * Particles Component
 * 
 * Renders the interactive particle system that responds to hand gestures.
 * Handles:
 * 1. Dual hand energy sphere
 * 2. Single hand gravity well (grab)
 * 3. Swipe/wind effects
 * 4. Idle floating behavior
 */
export const Particles: React.FC<ParticlesProps> = ({ handStateRef, baseColor, activeGesture }) => {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const { viewport } = useThree();

    const [activeWind, setActiveWind] = useState<'left' | 'right' | 'none'>('none');
    const windTimer = useRef<number | null>(null);

    // Initialize Particle Data
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < PARTICLE_CONFIG.COUNT; i++) {
            const x = (Math.random() - 0.5) * 16;
            const y = (Math.random() - 0.5) * 10;
            const z = (Math.random() - 0.5) * 4;

            // Sphere Target (Unit Sphere)
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            temp.push({
                home: new THREE.Vector3(x, y, z),
                current: new THREE.Vector3(x, y, z),
                sphereDir: new THREE.Vector3(
                    Math.sin(phi) * Math.cos(theta),
                    Math.sin(phi) * Math.sin(theta),
                    Math.cos(phi)
                ),
                phase: Math.random() * Math.PI * 2,
                speed: 0.02 + Math.random() * 0.05
            });
        }
        return temp;
    }, []);

    useFrame((state, delta) => {
        if (!mesh.current) return;

        const { isFist, isPresent, indexTip, swipeDirection, isTwoHanded, handDistance, centerPoint } = handStateRef.current;
        const time = state.clock.getElapsedTime();

        // --- GESTURE TRIGGER CHECKS ---
        if (swipeDirection !== 'none') {
            setActiveWind(swipeDirection);
            if (windTimer.current) clearTimeout(windTimer.current);
            windTimer.current = window.setTimeout(() => setActiveWind('none'), 600);
        }

        // --- MAP HAND POSITIONS ---
        const primaryHandPos = new THREE.Vector3(1000, 1000, 0);
        if (isPresent && indexTip) {
            primaryHandPos.set(
                (0.5 - indexTip.x) * viewport.width,
                (0.5 - indexTip.y) * viewport.height,
                0
            );
        }

        const dualHandCenter = new THREE.Vector3(0, 0, 0);
        if (isTwoHanded && centerPoint) {
            dualHandCenter.set(
                (0.5 - centerPoint.x) * viewport.width,
                (0.5 - centerPoint.y) * viewport.height,
                0
            );
        }

        // --- GESTURE PRIORITY SYSTEM ---
        // If grabbing an object, DISABLE all particle gestures (highest priority)
        if (activeGesture === 'grab') {
            particles.forEach((p, i) => {
                // Only idle mode - no fist, no two-hand, no interactions
                let target = new THREE.Vector3();
                target.copy(p.home);
                target.y += Math.sin(time + p.phase) * PARTICLE_ANIMATION.IDLE_WAVE_AMPLITUDE;

                // Smooth interpolation
                p.current.lerp(target, PARTICLE_ANIMATION.LERP_FACTOR);

                // Update matrix
                dummy.position.copy(p.current);
                dummy.scale.setScalar(1.0);
                dummy.rotation.set(0, 0, 0);
                dummy.updateMatrix();
                mesh.current.setMatrixAt(i, dummy.matrix);
            });

            mesh.current.instanceMatrix.needsUpdate = true;

            // Keep base color during grab
            if (mesh.current.material instanceof THREE.MeshBasicMaterial) {
                mesh.current.material.color.set(baseColor);
            }

            return; // Exit early - skip all gesture detection below
        }

        // --- UPDATE PARTICLES ---
        particles.forEach((p, i) => {
            let target = new THREE.Vector3();
            let scale = 1.0;

            // MODE 1: DUAL HAND ENERGY SPHERE
            if (isTwoHanded && centerPoint) {
                // NEW LOGIC: Calculate radius relative to screen space
                // 1. Convert normalized hand distance to approximate World Units
                const worldGap = handDistance * viewport.width;

                // 2. Set Radius to be roughly 35-40% of the gap (so Diameter is 70-80%)
                const sphereRadius = Math.max(0.5, worldGap * PARTICLE_ANIMATION.DUAL_HAND_SPHERE_RADIUS);

                // Calculate target on sphere surface
                target.copy(dualHandCenter).add(p.sphereDir.clone().multiplyScalar(sphereRadius));

                // Add high-energy vibration
                const jitter = 0.05 + (handDistance * 0.1);
                target.x += (Math.random() - 0.5) * jitter;
                target.y += (Math.random() - 0.5) * jitter;
                target.z += (Math.random() - 0.5) * jitter;

                // Particles rotate around center
                const rotSpeed = PARTICLE_ANIMATION.DUAL_HAND_ROTATION_SPEED;
                const x = target.x - dualHandCenter.x;
                const z = target.z - dualHandCenter.z;
                target.x = dualHandCenter.x + x * Math.cos(delta * rotSpeed) - z * Math.sin(delta * rotSpeed);
                target.z = dualHandCenter.z + x * Math.sin(delta * rotSpeed) + z * Math.cos(delta * rotSpeed);

            }
            // MODE 2: SINGLE HAND GRAB (Gravity Well)
            else if (isFist && isPresent) {
                target.copy(primaryHandPos).add(p.sphereDir.clone().multiplyScalar(0.8)); // Tighter grab radius
                scale = 0.6;
            }
            // MODE 3: IDLE / HOVER
            else {
                target.copy(p.home);
                target.y += Math.sin(time + p.phase) * PARTICLE_ANIMATION.IDLE_WAVE_AMPLITUDE;

                if (isPresent) {
                    const dist = target.distanceTo(primaryHandPos);
                    if (dist < PARTICLE_CONFIG.HAND_RADIUS) {
                        const pushDir = new THREE.Vector3().subVectors(target, primaryHandPos).normalize();
                        const pushDist = PARTICLE_CONFIG.HAND_RADIUS - dist;
                        target.add(pushDir.multiplyScalar(pushDist));
                    }
                }
            }

            // --- APPLY WIND FORCE (FLICK) ---
            if (activeWind === 'left') {
                target.x -= 8;
                scale = 0.5;
            } else if (activeWind === 'right') {
                target.x += 8;
                scale = 0.5;
            }

            // --- INTERPOLATION ---
            const lerpFactor = activeWind !== 'none' ? PARTICLE_ANIMATION.WIND_LERP_FACTOR : (isTwoHanded ? PARTICLE_ANIMATION.DUAL_HAND_LERP_FACTOR : PARTICLE_ANIMATION.LERP_FACTOR);
            p.current.lerp(target, lerpFactor);

            // --- MATRIX UPDATE ---
            dummy.position.copy(p.current);

            // Scale Y for "Motion Blur" streak effect during wind
            if (activeWind !== 'none') {
                dummy.scale.set(3, 0.2, 1);
                dummy.rotation.z = Math.PI / 2; // Horizontal streak
            } else {
                dummy.scale.setScalar(scale);
                dummy.rotation.set(0, 0, 0);
            }

            dummy.updateMatrix();
            mesh.current.setMatrixAt(i, dummy.matrix);
        });

        mesh.current.instanceMatrix.needsUpdate = true;

        // Dynamic Material Color
        if (mesh.current.material instanceof THREE.MeshBasicMaterial) {
            if (isTwoHanded) {
                // DUAL HAND OVERRIDE -> GOLD
                mesh.current.material.color.setHex(PARTICLE_COLORS.DUAL_HAND);
            } else if (activeWind !== 'none') {
                // FLICK OVERRIDE -> WHITE
                mesh.current.material.color.setHex(PARTICLE_COLORS.SWIPE);
            } else {
                // DEFAULT -> USER SELECTED VOICE COLOR
                mesh.current.material.color.set(baseColor);
            }
        }
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLE_CONFIG.COUNT]}>
            <sphereGeometry args={[PARTICLE_CONFIG.DOT_SIZE, 8, 8]} />
            <meshBasicMaterial
                color={baseColor}
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
                depthTest={false}
            />
        </instancedMesh>
    );
};
