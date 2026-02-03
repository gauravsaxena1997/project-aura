import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Ring } from '@react-three/drei';
import * as THREE from 'three';
import { HandTrackingState } from '../types';

interface ReticleProps {
    handStateRef: React.MutableRefObject<HandTrackingState>;
    baseColor: string;
}

/**
 * Reticle Component
 * 
 * Renders a visual tracking reticle that follows the user's hand/finger.
 * Provides visual feedback for hover, grab, and pinch states.
 */
export const Reticle: React.FC<ReticleProps> = ({ handStateRef, baseColor }) => {
    const ref = useRef<THREE.Group>(null);
    const { viewport } = useThree();

    useFrame(() => {
        if (!ref.current) return;
        const { isPresent, indexTip, isPinching, isFist, isTwoHanded } = handStateRef.current;

        // Hide reticle if using two hands (visuals are handled by particles)
        if (isPresent && indexTip && !isTwoHanded) {
            const x = (0.5 - indexTip.x) * viewport.width;
            const y = (0.5 - indexTip.y) * viewport.height;

            // Smooth movement
            ref.current.position.lerp(new THREE.Vector3(x, y, 0), 0.4);
            ref.current.visible = true;

            // Scale based on gesture state
            const scale = isFist ? 0.5 : (isPinching ? 0.8 : 1);
            ref.current.scale.setScalar(scale);
        } else {
            ref.current.visible = false;
        }
    });

    return (
        <group ref={ref}>
            <mesh>
                <sphereGeometry args={[0.03, 16, 16]} />
                <meshBasicMaterial color="white" blending={THREE.AdditiveBlending} depthTest={false} />
            </mesh>
            <Ring args={[0.1, 0.11, 32]}>
                <meshBasicMaterial color={baseColor} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthTest={false} />
            </Ring>
        </group>
    );
};
