import { useEffect, useState } from 'react';

interface UseVoiceCommandProps {
  onKeywordDetected: (keyword: string) => void;
}

export const useVoiceCommand = ({ onKeywordDetected }: UseVoiceCommandProps) => {
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      // Auto-restart to keep listening
      setIsListening(false);
      try {
        recognition.start();
      } catch (e) {
        // Ignore errors if already started
      }
    };

    recognition.onresult = (event: any) => {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
      
      console.log("Heard:", transcript);

      if (transcript.includes("aura")) {
        onKeywordDetected("aura");
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Error starting speech recognition:", e);
    }

    return () => {
      recognition.stop();
    };
  }, [onKeywordDetected]);

  return { isListening };
};
