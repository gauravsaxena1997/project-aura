import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Ring } from '@react-three/drei';
import * as THREE from 'three';
import { HandTrackingState } from '../types';

interface Aura3DProps {
  handStateRef: React.MutableRefObject<HandTrackingState>;
  pulseTrigger: number;
}

// --- CONSTANTS ---
const PARTICLE_COUNT = 600; // High density for "Cloud" look
const HAND_RADIUS = 2.5; // Size of the repulsion field
const DOT_SIZE = 0.025; // "Dot level" size

// --- 1. THE RIG (Always Visible Reference) ---
const SystemsCheckRing = () => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if(ref.current) {
            ref.current.rotation.z -= delta * 0.05;
        }
    });

    return (
        <group ref={ref}>
            <Ring args={[3.5, 3.52, 128]}>
                 <meshBasicMaterial color="#ffffff" transparent opacity={0.1} blending={THREE.AdditiveBlending} depthTest={false} />
            </Ring>
        </group>
    )
}

// --- 2. THE PARTICLE ENGINE (Position Based Dynamics) ---
const Particles = ({ handStateRef }: { handStateRef: React.MutableRefObject<HandTrackingState> }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { viewport } = useThree();

  // Initialize Particle Data
  // We use "Home" positions to anchor the simulation, preventing chaos.
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Full screen spread with slight depth variation
      const x = (Math.random() - 0.5) * 15;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 2; 

      // Sphere Formation Target (Pre-calculated for performance)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 1.2; // Sphere radius

      temp.push({ 
          home: new THREE.Vector3(x, y, z),
          current: new THREE.Vector3(x, y, z), // Current position
          sphereOffset: new THREE.Vector3( // Offset from hand center
              r * Math.sin(phi) * Math.cos(theta),
              r * Math.sin(phi) * Math.sin(theta),
              r * Math.cos(phi)
          ),
          phase: Math.random() * Math.PI * 2
      });
    }
    return temp;
  }, []);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    
    const { isFist, isPresent, indexTip } = handStateRef.current;
    const time = state.clock.getElapsedTime();
    
    // --- STEP 1: RESOLVE HAND POSITION ---
    // We map 2D screen coords to 3D world coords.
    // Default to "Far Away" if hand is missing so physics resets gracefully.
    const handPos = new THREE.Vector3(1000, 1000, 0); 
    
    if (isPresent && indexTip) {
        // COORDINATE MAPPING EXPLAINED:
        // MediaPipe X: 0 (Left) -> 1 (Right)
        // MediaPipe Y: 0 (Top)  -> 1 (Bottom)
        // ThreeJS X: 0 is Center. -Width/2 is Left.
        // ThreeJS Y: 0 is Center. +Height/2 is Top.
        // MIRROR EFFECT: We mirror the video via CSS, so we must mirror logic here.
        // Hand Real Right -> Screen Right -> MP x > 0.5 -> Three X > 0
        
        // Formula: (0.5 - rawX) * viewportWidth
        // If x=0.8 (Right side): (0.5 - 0.8) = -0.3. Wait? 
        // Let's use standard non-mirrored mapping and let the brain adjust, 
        // OR match the CSS scaleX(-1). 
        // If CSS flips video, a hand on the right of the frame (MP x=0.8) appears on the LEFT.
        // BUT we want the aura to follow the hand. 
        // If I raise my Right hand, it shows on Right side of screen (Mirror).
        // That means camera sees it on Left side (x=0.2).
        // So x=0.2 needs to map to Positive X.
        // (0.5 - 0.2) * width = 0.3 * width = Positive. Correct.
        
        const x = (0.5 - indexTip.x) * viewport.width;
        const y = (0.5 - indexTip.y) * viewport.height;
        
        if (Number.isFinite(x) && Number.isFinite(y)) {
            handPos.set(x, y, 0);
        }
    }

    // --- STEP 2: UPDATE PARTICLES ---
    particles.forEach((p, i) => {
        let target = new THREE.Vector3();

        if (isFist && isPresent) {
            // MODE: ATTRACT (Sphere)
            // Target is Hand Position + Sphere Offset
            target.copy(handPos).add(p.sphereOffset);
            
            // Add a swirl effect
            const swirlX = Math.sin(time * 3 + p.phase) * 0.1;
            const swirlY = Math.cos(time * 3 + p.phase) * 0.1;
            target.x += swirlX;
            target.y += swirlY;

        } else {
            // MODE: IDLE + REPEL
            // 1. Start with Home Position
            target.copy(p.home);

            // 2. Add "Breathing" animation
            target.y += Math.sin(time + p.phase) * 0.05;

            // 3. Calculate Repulsion (Displacement)
            if (isPresent) {
                const dist = target.distanceTo(handPos);
                
                // If hand is overlapping the particle's home...
                if (dist < HAND_RADIUS) {
                    // Calculate vector from Hand -> Home
                    const pushDir = new THREE.Vector3().subVectors(target, handPos).normalize();
                    
                    // Push it out exactly to the edge of the radius
                    // This is "Displacement", not "Force". It is stable.
                    const pushDist = HAND_RADIUS - dist;
                    target.add(pushDir.multiplyScalar(pushDist));
                }
            }
        }

        // --- STEP 3: INTERPOLATE (Smooth Movement) ---
        // Lerp factor controls "lag" or "weight". Higher = snappier.
        const lerpFactor = isFist ? 0.1 : 0.15;
        p.current.lerp(target, lerpFactor);

        // --- STEP 4: RENDER ---
        dummy.position.copy(p.current);
        
        // Scale logic:
        // Fist = Small condensed dots (0.6x)
        // Idle = Normal dots (1.0x)
        const scale = isFist ? 0.6 : 1.0;
        dummy.scale.setScalar(scale);
        
        dummy.updateMatrix();
        mesh.current.setMatrixAt(i, dummy.matrix);
    });
    
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[DOT_SIZE, 8, 8]} />
      <meshBasicMaterial 
        color="#22d3ee" // Cyan
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthTest={false} // CRITICAL: Renders on top of everything, preventing Z-clipping
      />
    </instancedMesh>
  );
};

// --- 3. THE RETICLE (Feedback UI) ---
const Reticle = ({ handStateRef }: { handStateRef: React.MutableRefObject<HandTrackingState> }) => {
    const ref = useRef<THREE.Group>(null);
    const { viewport } = useThree();

    useFrame(() => {
        if (!ref.current) return;
        const { isPresent, indexTip, isPinching, isFist } = handStateRef.current;

        if (isPresent && indexTip) {
            // Same coordinate math as particles
            const x = (0.5 - indexTip.x) * viewport.width;
            const y = (0.5 - indexTip.y) * viewport.height;
            
            // Smooth follow
            ref.current.position.lerp(new THREE.Vector3(x, y, 0), 0.4);
            ref.current.visible = true;
            
            // Visual State
            const scale = isFist ? 0.5 : (isPinching ? 0.8 : 1);
            ref.current.scale.setScalar(scale);

        } else {
            ref.current.visible = false;
        }
    });

    return (
        <group ref={ref}>
            {/* Inner Dot */}
            <mesh>
                <sphereGeometry args={[0.03, 16, 16]} />
                <meshBasicMaterial color="white" blending={THREE.AdditiveBlending} depthTest={false} />
            </mesh>
            {/* Outer Ring */}
            <Ring args={[0.1, 0.11, 32]}>
                <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthTest={false} />
            </Ring>
        </group>
    )
}

export const Aura3D = ({ handStateRef, pulseTrigger }: Aura3DProps) => {
  return (
    <>
      <ambientLight intensity={1} />
      <SystemsCheckRing />
      <Particles handStateRef={handStateRef} />
      <Reticle handStateRef={handStateRef} />
    </>
  );
};