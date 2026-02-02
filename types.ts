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
  indexTip: Landmark | null;
  thumbTip: Landmark | null;
  wrist: Landmark | null;
  isPinching: boolean;
  isFist: boolean; // New state for Grab gesture
  isPresent: boolean;
  swipeDirection: 'left' | 'right' | 'none';
}
