import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type ListeningState = 'idle' | 'requesting' | 'listening' | 'stopping';
export type SpeechRecognitionMode = 'on-device' | 'system-service';

function friendlyError(code: ExpoSpeechRecognitionErrorCode, message?: string): string {
  switch (code) {
    case 'not-allowed': return 'Microphone or speech recognition permission was denied. Enable it in system settings.';
    case 'service-not-allowed': return 'Speech recognition is unavailable. Enable the system speech recognition service and try again.';
    case 'language-not-supported': return 'English speech recognition is not supported by the active speech service.';
    case 'no-speech':
    case 'speech-timeout': return 'No speech was detected. Move closer to the questioner and try again.';
    case 'audio-capture': return 'The microphone could not start. Check whether another app is using it.';
    case 'network': return 'The system speech service reported a network error.';
    case 'busy': return 'The speech recognizer is busy. Wait a moment and try again.';
    case 'aborted': return '';
    default: return message || 'Speech recognition stopped unexpectedly.';
  }
}

export function useSpeechRecognition(contextualStrings: string[]) {
  const [state, setState] = useState<ListeningState>('idle');
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsOfflineModel, setNeedsOfflineModel] = useState(false);
  const [modelDownloadMessage, setModelDownloadMessage] = useState<string | null>(null);
  const [onDeviceRecognitionSupported, setOnDeviceRecognitionSupported] = useState(
    ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
  );
  const [englishLocaleSupported, setEnglishLocaleSupported] = useState<boolean | null>(null);
  const [recognitionMode, setRecognitionMode] = useState<SpeechRecognitionMode>(
    ExpoSpeechRecognitionModule.supportsOnDeviceRecognition() ? 'on-device' : 'system-service',
  );

  useSpeechRecognitionEvent('start', () => setState('listening'));
  useSpeechRecognitionEvent('result', (event) => {
    const next = event.results[0]?.transcript.trim() ?? '';
    if (next) setTranscript(next);
    if (event.isFinal && next) setFinalTranscript(next);
  });
  useSpeechRecognitionEvent('nomatch', () => setError('No clear speech was recognized. Please try again.'));
  useSpeechRecognitionEvent('error', (event) => {
    const next = friendlyError(event.error, event.message);
    if (next) setError(next);
  });
  useSpeechRecognitionEvent('end', () => setState('idle'));

  useEffect(() => () => {
    ExpoSpeechRecognitionModule.abort();
  }, []);

  const ensureAndroidOfflineEnglish = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) return true;
    try {
      const locales = await ExpoSpeechRecognitionModule.getSupportedLocales({
        androidRecognitionServicePackage: 'com.google.android.as',
      });
      const installed = locales.installedLocales.some((locale) => locale.toLowerCase().startsWith('en'));
      setNeedsOfflineModel(!installed);
      if (!installed) setError('Download the device’s English speech pack before listening offline.');
      return installed;
    } catch {
      setError('Couldn’t verify the device’s offline English speech pack.');
      return false;
    }
  }, []);

  const inspectRecognitionCapabilities = useCallback(async () => {
    const supportsOnDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
    setOnDeviceRecognitionSupported(supportsOnDevice);
    setRecognitionMode(supportsOnDevice ? 'on-device' : 'system-service');

    try {
      const locales = await ExpoSpeechRecognitionModule.getSupportedLocales({});
      const supportsEnglish = locales.locales.some((locale) => {
        const normalized = locale.toLowerCase();
        return normalized === 'en-us' || normalized.startsWith('en_') || normalized.startsWith('en-');
      });
      setEnglishLocaleSupported(supportsEnglish);
      if (!supportsEnglish) {
        throw new Error('The active Apple Speech recognizer does not report support for English (en-US).');
      }
    } catch (caught) {
      if (Platform.OS === 'ios') throw caught;
    }

    if (__DEV__) {
      console.info(
        `[Promptside Speech] locale=en-US, onDevice=${supportsOnDevice}, platform=${Platform.OS}`,
      );
    }
    return supportsOnDevice;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void inspectRecognitionCapabilities().catch((caught: unknown) => {
      setEnglishLocaleSupported(false);
      setError(caught instanceof Error ? caught.message : 'Couldn’t inspect Apple Speech capabilities.');
    });
  }, [inspectRecognitionCapabilities]);

  const start = useCallback(async () => {
    setError(null);
    setTranscript('');
    setFinalTranscript('');
    setModelDownloadMessage(null);
    setState('requesting');

    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setState('idle');
      setError('Speech recognition is unavailable. Install or enable the system speech recognition service.');
      return;
    }

    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setState('idle');
        setError('Microphone or speech recognition permission was denied. Enable it in system settings.');
        return;
      }

      const canRunOnDevice = await inspectRecognitionCapabilities();
      if (!(await ensureAndroidOfflineEnglish())) {
        setState('idle');
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        requiresOnDeviceRecognition: canRunOnDevice,
        addsPunctuation: canRunOnDevice,
        contextualStrings: contextualStrings.slice(0, 50),
      });
    } catch (caught) {
      setState('idle');
      setError(caught instanceof Error ? caught.message : 'Couldn’t start speech recognition.');
    }
  }, [contextualStrings, ensureAndroidOfflineEnglish, inspectRecognitionCapabilities]);

  const stop = useCallback(() => {
    setState('stopping');
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const downloadOfflineModel = useCallback(async () => {
    setError(null);
    setModelDownloadMessage('Opening the system speech pack installer…');
    try {
      const result = await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale: 'en-US' });
      if (result.status === 'download_success') {
        setNeedsOfflineModel(false);
        setModelDownloadMessage('English speech pack downloaded. You can listen now.');
      } else if (result.status === 'download_canceled') {
        setModelDownloadMessage('English speech pack download was canceled. Offline listening still needs it.');
      } else {
        setModelDownloadMessage('Complete the English speech pack download in the system dialog, then tap Listen again.');
      }
    } catch (caught) {
      setModelDownloadMessage(null);
      setError(caught instanceof Error ? caught.message : 'Couldn’t open the speech pack installer.');
    }
  }, []);

  return {
    state, transcript, finalTranscript, error, needsOfflineModel, modelDownloadMessage,
    onDeviceRecognitionSupported, englishLocaleSupported, recognitionMode,
    start, stop, downloadOfflineModel,
  };
}
