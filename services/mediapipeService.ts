import * as mpHands from '@mediapipe/hands';

// Fix for ESM/CJS interop issues with MediaPipe libraries on CDNs
const Hands = (mpHands as any).Hands || (mpHands as any).default?.Hands;

export class MediaPipeService {
  private static instance: any = null;

  static getInstance(): any {
    if (!this.instance) {
      console.log("Initializing MediaPipe Hands...");
      this.instance = new Hands({
        locateFile: (file: string) => {
          // Use a specific version to ensure the WASM files match the JS version
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
        },
      });

      this.instance.setOptions({
        maxNumHands: 2, // UPGRADED: Enable Dual Hand Tracking
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      console.log("MediaPipe Hands Initialized.");
    }
    return this.instance;
  }
}