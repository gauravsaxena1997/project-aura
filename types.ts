// MediaPipe Hands Type Definitions (Partial)
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface HandLandmarkResult {
  multiHandLandmarks: Landmark[][];
  multiHandedness: any[];
}

export interface HandTrackingState {
  // Primary Hand (Single interaction)
  indexTip: Landmark | null;
  thumbTip: Landmark | null;
  wrist: Landmark | null;
  
  // Dual Hand Data (New)
  isTwoHanded: boolean;
  handDistance: number; // Distance between hands (0.0 to 1.0)
  centerPoint: { x: number, y: number } | null; // Midpoint between hands

  // Gestures
  isPinching: boolean;
  isFist: boolean;
  isPresent: boolean;
  swipeDirection: 'left' | 'right' | 'none';
}