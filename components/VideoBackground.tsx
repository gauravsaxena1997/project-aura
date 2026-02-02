import React, { useEffect, useRef } from 'react';
import { MediaPipeService } from '../services/mediapipeService';
import { HandTrackingState, HandLandmarkResult } from '../types';

interface VideoBackgroundProps {
  handStateRef: React.MutableRefObject<HandTrackingState>;
  onGesture: (gesture: string) => void;
}

export const VideoBackground: React.FC<VideoBackgroundProps> = ({ handStateRef, onGesture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(0);
  const isProcessing = useRef<boolean>(false);
  
  // Logic Refs
  const prevWristX = useRef<number | null>(null);
  const swipeCooldown = useRef<boolean>(false);
  const wasPinching = useRef<boolean>(false);
  const wasFist = useRef<boolean>(false);

  useEffect(() => {
    let hands: any = null;

    const startCamera = async () => {
        if (!videoRef.current) return;

        try {
            hands = MediaPipeService.getInstance();
            hands.onResults(onResults);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: 'user' }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadeddata = () => {
                    videoRef.current?.play();
                    processFrame();
                };
            }
        } catch (err) {
            console.error(err);
            onGesture("ERROR: CAM_FAIL");
        }
    };

    const onResults = (results: any) => {
        isProcessing.current = false;
        const res = results as HandLandmarkResult;

        if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
            const landmarks = res.multiHandLandmarks[0];
            const wrist = landmarks[0];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            
            // Basic gestures
            const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
            const isPinching = pinchDist < 0.05;

            // Fist detection (simplified for stability)
            const tips = [8, 12, 16, 20].map(i => landmarks[i]);
            const isOpen = tips.every(tip => tip.y < landmarks[0].y - 0.1); // Are fingers above wrist? (simplified)
            // Actually, simple distance check is better
            const fingerDist = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
            const isFist = fingerDist < 0.15;

            // Update State
            handStateRef.current = {
                indexTip,
                thumbTip,
                wrist,
                isPinching,
                isFist,
                isPresent: true,
                swipeDirection: 'none'
            };

            // Trigger callbacks
            if (isPinching && !wasPinching.current) onGesture('PINCH');
            if (isFist && !wasFist.current) onGesture('GRAB');
            
            wasPinching.current = isPinching;
            wasFist.current = isFist;

        } else {
            handStateRef.current.isPresent = false;
        }
    };

    const processFrame = async () => {
        if (!videoRef.current || !hands) return;
        if (!isProcessing.current && videoRef.current.readyState === 4) {
            isProcessing.current = true;
            try {
                await hands.send({ image: videoRef.current });
            } catch (e) {
                isProcessing.current = false;
            }
        }
        requestRef.current = requestAnimationFrame(processFrame);
    };

    startCamera();

    return () => {
        cancelAnimationFrame(requestRef.current);
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        }
    };
  }, [handStateRef, onGesture]);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 w-full h-full object-cover filter brightness-50 contrast-125 grayscale"
      style={{ transform: 'scaleX(-1)' }} // Mirror Effect
      playsInline
      muted
    />
  );
};