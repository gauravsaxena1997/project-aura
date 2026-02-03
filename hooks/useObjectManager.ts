import { useState, useCallback, useRef } from 'react';
import { Vector3 } from 'three';

export interface InteractiveObject {
    id: string;
    position: Vector3;
    color: string;
    isHovered: boolean;
    isGrabbed: boolean;
}

interface UseObjectManagerProps {
    maxObjects?: number;
}

export const useObjectManager = ({ maxObjects = 5 }: UseObjectManagerProps = {}) => {
    const [objects, setObjects] = useState<InteractiveObject[]>([]);
    const nextIdRef = useRef(0);

    // Spawn a new object at random position
    const spawnObject = useCallback(() => {
        if (objects.length >= maxObjects) {
            console.log('[Objects] ❌ Max objects reached');
            return;
        }

        // Random position in SAME Z-PLANE as hand (z=0) for hover to work!
        // Spread across X and Y viewport
        const x = (Math.random() - 0.5) * 6;  // Wider spread
        const y = (Math.random() - 0.5) * 4;  // Vertical spread
        const z = -0.5 - Math.random() * 0.5; // Slightly behind hand (z=-0.5 to -1.0)

        const colors = ['#ff2a2a', '#2aff2a', '#2a2aff', '#22d3ee', '#bd00ff', '#ff7f00'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newObject: InteractiveObject = {
            id: `obj-${nextIdRef.current++}`,
            position: new Vector3(x, y, z),
            color: randomColor,
            isHovered: false,
            isGrabbed: false,
        };

        setObjects(prev => [...prev, newObject]);
        console.log(`[Objects] ✓ Spawned ${newObject.id} at`, { x: x.toFixed(2), y: y.toFixed(2), z: z.toFixed(2) });
    }, [objects.length, maxObjects]);

    // Clear all objects
    const clearObjects = useCallback(() => {
        setObjects([]);
        console.log('[Objects] All objects cleared');
    }, []);

    // Update object hover state based on index finger position
    const updateHover = useCallback((indexTip: { x: number; y: number; z: number } | null) => {
        if (!indexTip) {
            // Clear all hover states if no hand
            setObjects(prev => prev.map(obj => ({ ...obj, isHovered: false })));
            return;
        }

        const fingerPos = new Vector3(indexTip.x, indexTip.y, indexTip.z);
        const HOVER_DISTANCE = 1.5; // Increased for larger objects (was 0.3)

        setObjects(prev => prev.map(obj => {
            const distance = fingerPos.distanceTo(obj.position);
            const isHovered = distance < HOVER_DISTANCE && !obj.isGrabbed;

            return { ...obj, isHovered };
        }));
    }, []);

    // Grab hovered object when pinch detected
    const grabObject = useCallback((indexTip: { x: number; y: number; z: number } | null) => {
        if (!indexTip) return;

        setObjects(prev => prev.map(obj => {
            if (obj.isHovered && !obj.isGrabbed) {
                console.log(`[Objects] Grabbed ${obj.id}`);
                return { ...obj, isGrabbed: true };
            }
            return obj;
        }));
    }, []);

    // Release grabbed object
    const releaseObject = useCallback(() => {
        setObjects(prev => prev.map(obj => {
            if (obj.isGrabbed) {
                console.log(`[Objects] Released ${obj.id}`);
                return { ...obj, isGrabbed: false };
            }
            return obj;
        }));
    }, []);

    // Update position of grabbed objects to follow hand
    const updateGrabbedPosition = useCallback((handPos: { x: number; y: number; z: number } | null) => {
        if (!handPos) return;

        const targetPos = new Vector3(handPos.x, handPos.y, handPos.z);

        setObjects(prev => prev.map(obj => {
            if (obj.isGrabbed) {
                // Smooth interpolation for natural movement
                const newPos = obj.position.clone().lerp(targetPos, 0.3);
                return { ...obj, position: newPos };
            }
            return obj;
        }));
    }, []);

    // Set specific object color
    const setObjectColor = useCallback((id: string, color: string) => {
        setObjects(prev => prev.map(obj => {
            if (obj.id === id) {
                console.log(`[Objects] 🎨 Color updated for ${id}: ${color}`);
                return { ...obj, color };
            }
            return obj;
        }));
    }, []);

    // Remove specific object
    const removeObject = useCallback((id: string) => {
        setObjects(prev => prev.filter(obj => obj.id !== id));
        console.log(`[Objects] 🗑️ Removed object: ${id}`);
    }, []);

    return {
        objects,
        spawnObject,
        clearObjects,
        updateHover,
        grabObject,
        releaseObject,
        updateGrabbedPosition,
        setObjectColor,
        removeObject,
    };
};
