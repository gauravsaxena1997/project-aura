import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export class MediaPipeFaceService {
    private static instance: FaceLandmarker | null = null;
    private static isInitializing: boolean = false;

    static async getInstance(): Promise<FaceLandmarker> {
        if (this.instance) return this.instance;

        // Simple retry loop for race conditions during fast reloads
        if (this.isInitializing) {
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (this.instance) {
                        clearInterval(checkInterval);
                        resolve(this.instance);
                    }
                }, 100);
            });
        }

        this.isInitializing = true;

        try {
            console.log('👁️ Initializing MediaPipe FaceLandmarker...');
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
            );

            this.instance = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numFaces: 1,
                minFaceDetectionConfidence: 0.7,
                minFacePresenceConfidence: 0.7,
                outputFaceBlendshapes: true,
                outputFacialTransformationMatrixes: true
            });

            console.log('✅ MediaPipe FaceLandmarker Ready');
        } catch (error) {
            console.error('❌ Failed to initialize FaceLandmarker:', error);
            throw error;
        } finally {
            this.isInitializing = false;
        }

        // Force non-null assertion since we throw on failure
        return this.instance!;
    }
}
