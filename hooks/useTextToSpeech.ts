import { useState, useEffect, useCallback } from 'react';
import { Language } from '../types';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Effect to load and update the list of available system voices robustly.
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setError("Speech synthesis is not supported by this browser.");
      return;
    }

    let intervalId: number | undefined;

    const populateVoiceList = () => {
      const newVoices = speechSynthesis.getVoices();
      if (newVoices.length > 0) {
        setVoices(newVoices);
        if (intervalId) {
          clearInterval(intervalId);
        }
      }
    };

    // Attempt to populate the list immediately.
    populateVoiceList();

    // The 'voiceschanged' event is the standard way to get voices.
    speechSynthesis.addEventListener('voiceschanged', populateVoiceList);

    // Some browsers are slow to load voices. If the list is empty,
    // we poll for a short time as a fallback mechanism.
    if (speechSynthesis.getVoices().length === 0) {
      intervalId = window.setInterval(populateVoiceList, 100);
    }
    
    // Cleanup function to remove listeners and intervals.
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', populateVoiceList);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);


  const cancel = useCallback(() => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    // The onend event will handle setting isSpeaking to false.
  }, []);

  const speak = useCallback((text: string, lang: Language, voiceURI?: string) => {
    if (isSpeaking) {
      cancel();
    }
    if (!('speechSynthesis' in window)) {
      setError("Speech synthesis is not supported by this browser.");
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    const [langPart, regionPart] = lang.split('-');
    let voiceToUse: SpeechSynthesisVoice | null = null;

    // Tier 1: Prioritize the user-selected voice from the dropdown.
    if (voiceURI) {
      voiceToUse = voices.find(v => v.voiceURI === voiceURI) || null;
    }

    // Tier 2: If no voice is selected or found, perform a comprehensive search for the best match.
    if (!voiceToUse) {
      const matchingVoices = voices.filter(v => v.lang === lang || v.lang === langPart);

      if (matchingVoices.length > 0) {
        // Find the best option among direct language matches.
        voiceToUse =
          matchingVoices.find(v => v.default) ||
          matchingVoices.find(v => v.name.toLowerCase().includes('google')) ||
          matchingVoices[0];
      } else if (regionPart) {
        // Tier 3 (Fallback): If no direct language match, find a voice from the same region
        // (e.g., find 'en-IN' for 'hi-IN'). This often provides a more suitable accent.
        const regionalVoices = voices.filter(v => v.lang.endsWith(`-${regionPart}`));
        if (regionalVoices.length > 0) {
          voiceToUse = regionalVoices.find(v => v.default) || regionalVoices[0];
        }
      }
    }

    if (voiceToUse) {
      utterance.voice = voiceToUse;
    }
    
    // Always set the lang property on the utterance. This is a crucial fallback
    // for the browser to select an appropriate voice if the `voice` object is null
    // or if the assigned voice fails for some reason.
    utterance.lang = lang;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setError(null);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = (event) => {
      console.error("SpeechSynthesisUtterance.onerror", event);
      setError(`An error occurred during speech synthesis: ${event.error}`);
      setIsSpeaking(false);
    };
    
    speechSynthesis.speak(utterance);
    
  }, [voices, isSpeaking, cancel]);

  return { isSpeaking, speak, cancel, voices, error };
};