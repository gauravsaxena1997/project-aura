import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Ring } from '@react-three/drei';
import * as THREE from 'three';

/**
 * SystemsCheckRing Component
 * 
 * A purely decorative rotating ring that provides visual feedback
 * that the 3D scene is active and rendering.
 */
export const SystemsCheckRing: React.FC = () => {
    const ref = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (ref.current) {
            // Rotate slowly over time
            ref.current.rotation.z -= delta * 0.05;
        }
    });

    return (
        <group ref={ref}>
            <Ring args={[3.5, 3.52, 128]}>
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.1}
                    blending={THREE.AdditiveBlending}
                    depthTest={false}
                />
            </Ring>
        </group>
    );
};
