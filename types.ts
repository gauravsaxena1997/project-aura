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
  isPinching: boolean; // Tip-to-Tip (Grab)
  isTapping: boolean;  // Thumb-to-PIP (Click)
  isFist: boolean;
  isPresent: boolean;
  swipeDirection: 'left' | 'right' | 'none';
}

// Click Detection State
export interface ClickState {
  count: number;
  lastClickTime: number;
  source: 'tap' | 'blink' | null;
}