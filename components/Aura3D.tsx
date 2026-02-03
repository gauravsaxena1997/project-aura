import React from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { HandTrackingState } from '../types';
import { GestureType } from '../types/gestures.types';
import { InteractiveObject } from '../hooks/useObjectManager';
import { GrabbableObjects } from './GrabbableObjects';
import { Particles } from './Particles';
import { SystemsCheckRing } from './SystemsCheckRing';
import { Reticle } from './Reticle';

interface Aura3DProps {
    handStateRef: React.MutableRefObject<HandTrackingState>;
    pulseTrigger: number;
    baseColor: string;
    objects: InteractiveObject[];
    objectManager: {
        updateHover: (indexTip: { x: number; y: number; z: number } | null) => void;
        grabObject: (indexTip: { x: number; y: number; z: number } | null) => void;
        releaseObject: () => void;
        updateGrabbedPosition: (handPos: { x: number; y: number; z: number } | null) => void;
    };
    prevPinchRef: React.MutableRefObject<boolean>;
    activeGesture: GestureType; // CRITICAL: Gesture from priority hook
}

export const Aura3D = ({ handStateRef, pulseTrigger, baseColor, objects, objectManager, prevPinchRef, activeGesture }: Aura3DProps) => {
    const { viewport } = useThree();

    // NOTE: isGrabbingObject removed - priority is now handled by useGesturePriority hook in App.tsx

    // Handle object interactions in animation frame (60fps, no React re-renders)
    useFrame(() => {
        const handState = handStateRef.current;

        // Transform hand coordinates from normalized (0-1) to 3D world space
        let handWorldPos: { x: number; y: number; z: number } | null = null;
        if (handState.isPresent && handState.indexTip) {
            // Same transformation as particles use (see lines 96-102)
            handWorldPos = {
                x: (0.5 - handState.indexTip.x) * viewport.width,
                y: (0.5 - handState.indexTip.y) * viewport.height,
                z: 0 // Hand is at z=0 in world space
            };
        }

        // Update hover states based on transformed hand position
        objectManager.updateHover(handWorldPos);

        // Update grabbed object positions
        if (handWorldPos && handState.isPinching) {
            objectManager.updateGrabbedPosition(handWorldPos);
        }

        // Detect pinch transitions
        const isPinchingNow = handState.isPinching;
        const wasPinching = prevPinchRef.current;

        if (isPinchingNow && !wasPinching) {
            // Pinch just started → Grab hovered object
            objectManager.grabObject(handWorldPos);
        } else if (!isPinchingNow && wasPinching) {
            // DEBUG: Log the activeGesture value
            console.log(`[Objects] 🔍 Release triggered - activeGesture: "${activeGesture}", isTwoHanded: ${handState.isTwoHanded}`);

            // CRITICAL FIX: Only block release if two hands are detected
            // This prevents release when second hand appears (hand array reorders)
            // But allows release when user actually stops pinching with one hand
            if (handState.isTwoHanded && activeGesture === 'grab') {
                console.log('[Objects] 🛡️ Release blocked - two hands detected, grab still active');
            } else {
                console.log('[Objects] ✓ Releasing object (legitimate release)');
                objectManager.releaseObject();
            }
        }

        prevPinchRef.current = isPinchingNow;
    });

    return (
        <>
            <ambientLight intensity={1} />
            <SystemsCheckRing />
            <Reticle handStateRef={handStateRef} baseColor={baseColor} />
            <Particles handStateRef={handStateRef} baseColor={baseColor} activeGesture={activeGesture} />
            <GrabbableObjects objects={objects} />
        </>
    );
};