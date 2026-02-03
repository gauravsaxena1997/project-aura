import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { InteractiveObject } from '../hooks/useObjectManager';

interface GrabbableObjectsProps {
    objects: InteractiveObject[];
}

// Define different shape types with varied geometry - LARGER sizes for better interaction
const SHAPE_TYPES = [
    { name: 'diamond', geometry: <octahedronGeometry args={[0.5, 0]} />, rotSpeed: 0.03 },
    { name: 'dodecahedron', geometry: <dodecahedronGeometry args={[0.45, 0]} />, rotSpeed: 0.025 },
    { name: 'icosahedron', geometry: <icosahedronGeometry args={[0.5, 0]} />, rotSpeed: 0.02 },
    { name: 'tetrahedron', geometry: <tetrahedronGeometry args={[0.6, 0]} />, rotSpeed: 0.035 },
];

const GrabbableObject: React.FC<{ object: InteractiveObject }> = ({ object }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Choose shape based on object ID (deterministic but varied)
    const shapeIndex = parseInt(object.id.split('-')[1] || '0') % SHAPE_TYPES.length;
    const shape = SHAPE_TYPES[shapeIndex];

    useFrame((state) => {
        if (!meshRef.current) return;

        // Apply hover/grab effects with smooth scaling
        const targetScale = object.isHovered ? 1.3 : 1.0;
        const currentScale = meshRef.current.scale.x;
        meshRef.current.scale.setScalar(THREE.MathUtils.lerp(currentScale, targetScale, 0.2));

        // Complex rotation when grabbed - shows shape better
        if (object.isGrabbed) {
            meshRef.current.rotation.x += shape.rotSpeed * 1.5;
            meshRef.current.rotation.y += shape.rotSpeed * 1.2;
            meshRef.current.rotation.z += shape.rotSpeed * 0.8;
        } else {
            // Gentle idle rotation
            meshRef.current.rotation.y += 0.005;
        }

        // Position update (already handled by object manager, just apply it)
        meshRef.current.position.copy(object.position);
    });

    return (
        <mesh ref={meshRef} position={object.position}>
            {shape.geometry}
            <meshStandardMaterial
                color={object.color}
                emissive={object.isHovered ? object.color : '#000000'}
                emissiveIntensity={object.isHovered ? 0.6 : 0}
                transparent
                opacity={object.isGrabbed ? 0.95 : 0.8}
                roughness={0.3}
                metalness={0.7}
            />

            {/* Glow effect when hovered or grabbed - larger for emphasis */}
            {(object.isHovered || object.isGrabbed) && (
                <mesh scale={1.4}>
                    {shape.geometry}
                    <meshBasicMaterial
                        color={object.color}
                        transparent
                        opacity={object.isGrabbed ? 0.3 : 0.2}
                        blending={THREE.AdditiveBlending}
                        depthTest={false}
                    />
                </mesh>
            )}

            {/* Edge glow for grabbed objects */}
            {object.isGrabbed && (
                <mesh scale={1.6}>
                    {shape.geometry}
                    <meshBasicMaterial
                        color="#00ffff"
                        transparent
                        opacity={0.1}
                        blending={THREE.AdditiveBlending}
                        depthTest={false}
                        wireframe
                    />
                </mesh>
            )}
        </mesh>
    );
};

export const GrabbableObjects: React.FC<GrabbableObjectsProps> = ({ objects }) => {
    return (
        <>
            <pointLight position={[0, 5, 5]} intensity={0.5} color="#ffffff" />
            <pointLight position={[0, -5, -5]} intensity={0.3} color="#22d3ee" />
            <pointLight position={[5, 0, 0]} intensity={0.2} color="#ec4899" />

            {objects.map((obj) => (
                <GrabbableObject key={obj.id} object={obj} />
            ))}
        </>
    );
};
