import { useEffect, useState, useRef, useCallback } from 'react';

interface UseVoiceCommandProps {
  onKeywordDetected: (keyword: string) => void;
}

const SUPPORTED_COLORS = ['red', 'green', 'blue', 'white', 'cyan', 'purple', 'orange', 'pink', 'yellow', 'magenta', 'teal', 'gold', 'violet'];

export const useVoiceCommand = ({ onKeywordDetected }: UseVoiceCommandProps) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const shouldRetryRef = useRef(true);

  // Function to start manually (can be called from UI)
  const startListening = useCallback(() => {
    setError(null);
    shouldRetryRef.current = true;
    try {
        if (recognitionRef.current) {
            recognitionRef.current.start();
        }
    } catch (e) {
        // Often throws if already started, safe to ignore
    }
  }, []);

  useEffect(() => {
    // Browser compatibility check
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("NO_API");
      console.warn("Web Speech API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log("Voice System: ONLINE");
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      
      // Only restart if we haven't hit a fatal error and we want to retry
      if (shouldRetryRef.current) {
          // Debounce restart to prevent CPU/Log thrashing
          setTimeout(() => {
              if (shouldRetryRef.current) {
                  try {
                    recognition.start();
                  } catch (e) {
                    // Ignore errors if already started
                  }
              }
          }, 1000);
      } else {
          console.log("Voice System: OFFLINE (Stopped)");
      }
    };

    recognition.onerror = (event: any) => {
        // Filter out "no-speech" which is just silence, not an error
        if (event.error === 'no-speech') {
            return; 
        }

        console.warn("Voice Warning:", event.error);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            shouldRetryRef.current = false; // Stop the restart loop
            setError("PERM_DENIED");
            setIsListening(false);
        } else if (event.error === 'audio-capture') {
            shouldRetryRef.current = false;
            setError("NO_MIC");
            setIsListening(false);
        }
    };

    recognition.onresult = (event: any) => {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
      
      console.log("Input:", transcript);

      if (transcript.includes("aura")) {
        onKeywordDetected("aura");
      }

      for (const color of SUPPORTED_COLORS) {
        if (transcript.includes(color)) {
            onKeywordDetected(`COLOR:${color}`);
        }
      }
    };

    // Attempt auto-start (might be blocked by browser policy until user gesture)
    try {
        recognition.start();
    } catch (e) {
        // If auto-start fails, we wait for user manual start
    }

    return () => {
      shouldRetryRef.current = false;
      recognition.stop();
    };
  }, [onKeywordDetected]);

  return { isListening, error, startListening };
};