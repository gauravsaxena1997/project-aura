import React, { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Ring } from '@react-three/drei';
import * as THREE from 'three';
import { HandTrackingState } from '../types';

interface Aura3DProps {
  handStateRef: React.MutableRefObject<HandTrackingState>;
  pulseTrigger: number;
}

// --- CONSTANTS ---
const PARTICLE_COUNT = 800; 
const HAND_RADIUS = 2.5; 
const DOT_SIZE = 0.02; 

// --- 1. THE RIG ---
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

// --- 2. THE PARTICLE ENGINE ---
const Particles = ({ handStateRef }: { handStateRef: React.MutableRefObject<HandTrackingState> }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { viewport } = useThree();

  const [activeWind, setActiveWind] = useState<'left' | 'right' | 'none'>('none');
  const windTimer = useRef<number | null>(null);

  // Initialize Particle Data
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
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

    const dualHandCenter = new THREE.Vector3(0,0,0);
    if (isTwoHanded && centerPoint) {
        dualHandCenter.set(
            (0.5 - centerPoint.x) * viewport.width,
            (0.5 - centerPoint.y) * viewport.height,
            0
        );
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
            // This ensures it fits *inside* the hands.
            // clamp minimum size to 0.5 so it doesn't vanish.
            const sphereRadius = Math.max(0.5, worldGap * 0.35);
            
            // Calculate target on sphere surface
            target.copy(dualHandCenter).add(p.sphereDir.clone().multiplyScalar(sphereRadius));
            
            // Add high-energy vibration
            const jitter = 0.05 + (handDistance * 0.1); // More jitter when hands are far apart (high energy)
            target.x += (Math.random() - 0.5) * jitter;
            target.y += (Math.random() - 0.5) * jitter;
            target.z += (Math.random() - 0.5) * jitter;
            
            // Particles rotate around center
            const rotSpeed = 3.0;
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
            target.y += Math.sin(time + p.phase) * 0.1;

            if (isPresent) {
                const dist = target.distanceTo(primaryHandPos);
                if (dist < HAND_RADIUS) {
                    const pushDir = new THREE.Vector3().subVectors(target, primaryHandPos).normalize();
                    const pushDist = HAND_RADIUS - dist;
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
        const lerpFactor = activeWind !== 'none' ? 0.05 : (isTwoHanded ? 0.15 : 0.12);
        p.current.lerp(target, lerpFactor);

        // --- MATRIX UPDATE ---
        dummy.position.copy(p.current);
        
        // Scale Y for "Motion Blur" streak effect during wind
        if (activeWind !== 'none') {
            dummy.scale.set(3, 0.2, 1); 
            dummy.rotation.z = Math.PI / 2; // Horizontal streak
        } else {
            dummy.scale.setScalar(scale);
            dummy.rotation.set(0,0,0);
        }

        dummy.updateMatrix();
        mesh.current.setMatrixAt(i, dummy.matrix);
    });
    
    mesh.current.instanceMatrix.needsUpdate = true;
    
    // Dynamic Material Color
    if (mesh.current.material instanceof THREE.MeshBasicMaterial) {
        if (isTwoHanded) mesh.current.material.color.setHex(0xffaa00); // Gold for Energy Sphere
        else if (activeWind !== 'none') mesh.current.material.color.setHex(0xffffff); // White for Wind
        else mesh.current.material.color.setHex(0x22d3ee); // Cyan default
    }
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[DOT_SIZE, 8, 8]} />
      <meshBasicMaterial 
        color="#22d3ee"
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthTest={false} 
      />
    </instancedMesh>
  );
};

// --- 3. THE RETICLE ---
const Reticle = ({ handStateRef }: { handStateRef: React.MutableRefObject<HandTrackingState> }) => {
    const ref = useRef<THREE.Group>(null);
    const { viewport } = useThree();

    useFrame(() => {
        if (!ref.current) return;
        const { isPresent, indexTip, isPinching, isFist, isTwoHanded } = handStateRef.current;

        // Hide reticle if using two hands (visuals are handled by particles)
        if (isPresent && indexTip && !isTwoHanded) {
            const x = (0.5 - indexTip.x) * viewport.width;
            const y = (0.5 - indexTip.y) * viewport.height;
            
            ref.current.position.lerp(new THREE.Vector3(x, y, 0), 0.4);
            ref.current.visible = true;
            
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