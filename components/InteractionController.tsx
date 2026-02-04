import React, { useEffect, useRef } from 'react';
import { FaceTracking } from './FaceTracking';
import { HandTrackingState } from '../types';
import { InteractionType } from '../config/click.config';

interface InteractionControllerProps {
    handStateRef: React.MutableRefObject<HandTrackingState>;
    videoElement: HTMLVideoElement | null;
    onTrigger: (source: InteractionType) => boolean;
    onGesture: (message: string) => void;
}

export const InteractionController: React.FC<InteractionControllerProps> = ({
    handStateRef,
    videoElement,
    onTrigger,
    onGesture
}) => {
    const requestRef = useRef<number>(0);
    const prevTapRef = useRef<boolean>(false); // Track local tap state for edge detection

    // --- FACE INTERACTION (BLINK) ---
    const handleBlink = () => {
        if (onTrigger('blink')) {
            onGesture('CLICK (BLINK)'); // Or let useClickSystem handle logging if passed down
        }
    };

    // --- HAND INTERACTION (TAP) ---
    // Poll hand state for tap gesture (logic moved out of 3D scene)
    useEffect(() => {
        const checkHandInteractions = () => {
            const hand = handStateRef.current;

            // TAP DETECTION (Rising Edge)
            const isTappingNow = hand.isTapping;
            const wasTapping = prevTapRef.current;

            if (isTappingNow && !wasTapping) {
                // Trigger Click
                if (onTrigger('tap')) {
                    onGesture('CLICK (TAP)');
                }
            }
            prevTapRef.current = isTappingNow;

            requestRef.current = requestAnimationFrame(checkHandInteractions);
        };

        requestRef.current = requestAnimationFrame(checkHandInteractions);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [handStateRef, onTrigger, onGesture]);

    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Logic-only component, renders children that need DOM structure */}
            <FaceTracking
                videoElement={videoElement}
                onBlink={handleBlink}
                enabled={true}
            />
        </div>
    );
};
