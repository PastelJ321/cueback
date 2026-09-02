import { useCallback, useRef, useState } from 'react';

import {
  isOnDeviceTranslationAvailable,
  translateEnglishToKorean,
} from '../../modules/promptside-translation';

export function useOnDeviceTranslation() {
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const translate = useCallback(async (text: string) => {
    const sourceText = text.trim();
    if (!sourceText) return;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsTranslating(true);
    setError(null);

    try {
      const result = await translateEnglishToKorean(sourceText);
      if (requestIdRef.current === requestId) setTranslatedText(result);
    } catch (caught) {
      if (requestIdRef.current === requestId) {
        setError(caught instanceof Error ? caught.message : 'On-device translation failed.');
      }
    } finally {
      if (requestIdRef.current === requestId) setIsTranslating(false);
    }
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setTranslatedText('');
    setIsTranslating(false);
    setError(null);
  }, []);

  return {
    isAvailable: isOnDeviceTranslationAvailable(),
    translatedText,
    isTranslating,
    error,
    translate,
    reset,
  };
}
