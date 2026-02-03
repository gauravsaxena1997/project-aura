import { useEffect, useState, useRef, useCallback } from 'react';

interface UseVoiceCommandProps {
  onColorDetected: (color: string) => void;
}

// Error types for better UX messaging
export type VoiceErrorType = 'NO_DEVICE' | 'PERM_DENIED' | 'NO_API' | 'NO_MIC' | 'PERM_DISMISSED' | null;

// Supported colors for voice commands
const SUPPORTED_COLORS = ['red', 'green', 'blue', 'white', 'cyan', 'purple', 'orange', 'pink', 'yellow', 'magenta', 'teal', 'gold', 'violet'];

export const useVoiceCommand = ({ onColorDetected }: UseVoiceCommandProps) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<VoiceErrorType>(null);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const shouldRetryRef = useRef(true);
  const lastProcessedColorRef = useRef<string>('');
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to check if microphone devices exist
  const checkMicrophoneAvailability = async (): Promise<boolean> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      console.log(`[Voice] Found ${audioInputs.length} audio input device(s)`);
      return audioInputs.length > 0;
    } catch (err) {
      console.error('[Voice] Failed to enumerate devices:', err);
      return false;
    }
  };

  // Function to start manually (can be called from UI)
  const startListening = useCallback(async () => {
    setError(null);
    shouldRetryRef.current = true;

    // Step 1: Check if any audio devices exist
    const hasDevices = await checkMicrophoneAvailability();
    if (!hasDevices) {
      console.error('[Voice] No audio input devices found');
      setError('NO_DEVICE');
      return;
    }

    // Step 2: Request microphone permission explicitly
    try {
      console.log('[Voice] Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Voice] ✓ Microphone permission granted');
      stream.getTracks().forEach(track => track.stop());
    } catch (err: any) {
      console.error('[Voice] Microphone access failed:', err.name, err.message);

      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('NO_DEVICE');
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('PERM_DENIED');
      } else if (err.name === 'AbortError') {
        setError('PERM_DISMISSED');
      } else {
        setError('NO_MIC');
      }
      return;
    }

    // Step 3: Start speech recognition
    try {
      if (recognitionRef.current) {
        console.log('[Voice] Starting speech recognition...');
        recognitionRef.current.start();
      }
    } catch (e: any) {
      if (e.name === 'InvalidStateError') {
        console.log('[Voice] Recognition already running, restarting...');
        recognitionRef.current?.abort();
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (e2) {
            console.error('[Voice] Failed to restart:', e2);
          }
        }, 100);
      }
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("NO_API");
      console.warn("[Voice] Web Speech API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log("[Voice] ✓ Listening... (say 'Aura')");
      setIsListening(true);
      setError(null);
    };

    recognition.onaudiostart = () => {
      console.log("[Voice] 🎤 Microphone active");
    };

    recognition.onspeechstart = () => {
      console.log("[Voice] 🗣️ Speech detected...");
    };

    recognition.onend = () => {
      console.log("[Voice] Session ended, restarting...");
      setIsListening(false);

      // Clear any existing restart timeout
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }

      // Restart quickly if we should keep listening
      if (shouldRetryRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          if (shouldRetryRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.log('[Voice] Restart delayed, will retry...');
              // If it fails, try again after a longer delay
              setTimeout(() => {
                try {
                  recognitionRef.current?.start();
                } catch (e2) {
                  // Give up after second try
                }
              }, 500);
            }
          }
        }, 100); // Quick restart - 100ms
      }
    };

    recognition.onerror = (event: any) => {
      const errorType = event.error;

      // no-speech is normal, just restart
      if (errorType === 'no-speech') {
        console.log("[Voice] No speech detected, still listening...");
        return;
      }

      // aborted is normal when we restart
      if (errorType === 'aborted') {
        return;
      }

      console.warn("[Voice] Error:", errorType);

      if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
        shouldRetryRef.current = false;
        setError("PERM_DENIED");
        setIsListening(false);
      } else if (errorType === 'audio-capture') {
        shouldRetryRef.current = false;
        setError("NO_MIC");
        setIsListening(false);
      } else if (errorType === 'network') {
        console.error("[Voice] Network error - Google Speech API may be unavailable");
        // Keep trying on network errors
      }
    };

    recognition.onresult = (event: any) => {
      // Process ALL results for responsiveness
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim().toLowerCase();
        const isFinal = result.isFinal;
        const confidence = result[0].confidence || 0;

        // Update last transcript for UI display
        setLastTranscript(transcript);

        // Log for debugging
        if (isFinal) {
          console.log(`[Voice] 🎤 "${transcript}" (${(confidence * 100).toFixed(0)}%)`);
        } else {
          console.log(`[Voice] ... ${transcript}`);
        }

        // Pass ALL final transcripts to the handler (not just colors)
        // This allows commands like "create object", "clear objects", etc.
        if (isFinal && transcript.length > 0) {
          onColorDetected(transcript); // Handler name is onColorDetected but it handles all commands now
        }
      }
    };

    // Cleanup
    return () => {
      shouldRetryRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      try {
        recognition.abort();
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [onColorDetected]);

  return { isListening, error, startListening, lastTranscript };
};