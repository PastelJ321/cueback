import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export type ListeningState = 'idle' | 'requesting' | 'listening' | 'stopping';
export type SpeechRecognitionMode = 'on-device' | 'system-service';

const MAX_TRANSCRIPT_CANDIDATES = 3;

function appendTranscriptSegment(prefix: string, segment: string): string {
  const cleanPrefix = prefix.trim();
  const cleanSegment = segment.trim();
  if (!cleanPrefix) return cleanSegment;
  if (!cleanSegment) return cleanPrefix;

  const normalizedPrefix = cleanPrefix.toLocaleLowerCase();
  const normalizedSegment = cleanSegment.toLocaleLowerCase();
  if (normalizedSegment.startsWith(normalizedPrefix)) return cleanSegment;
  if (normalizedPrefix.endsWith(normalizedSegment)) return cleanPrefix;
  return `${cleanPrefix} ${cleanSegment}`;
}

function combineCandidateSegments(prefixes: string[], segments: string[]): string[] {
  const count = Math.min(
    MAX_TRANSCRIPT_CANDIDATES,
    Math.max(prefixes.length, segments.length),
  );
  return Array.from({ length: count }, (_, index) => appendTranscriptSegment(
    prefixes[index] ?? prefixes[0] ?? '',
    segments[index] ?? segments[0] ?? '',
  )).filter(Boolean);
}

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

export function useSpeechRecognition() {
  const [state, setState] = useState<ListeningState>('idle');
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [finalTranscriptCandidates, setFinalTranscriptCandidates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(-2);
  const [needsOfflineModel, setNeedsOfflineModel] = useState(false);
  const [modelDownloadMessage, setModelDownloadMessage] = useState<string | null>(null);
  const [onDeviceRecognitionSupported, setOnDeviceRecognitionSupported] = useState(
    ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
  );
  const [englishLocaleSupported, setEnglishLocaleSupported] = useState<boolean | null>(null);
  const [recognitionMode, setRecognitionMode] = useState<SpeechRecognitionMode>(
    ExpoSpeechRecognitionModule.supportsOnDeviceRecognition() ? 'on-device' : 'system-service',
  );
  const completedCandidatesRef = useRef<string[]>([]);
  const latestCandidatesRef = useRef<string[]>([]);

  useSpeechRecognitionEvent('start', () => setState('listening'));
  useSpeechRecognitionEvent('result', (event) => {
    const nextCandidates = event.results
      .map((result) => result.transcript.trim())
      .filter(Boolean)
      .slice(0, MAX_TRANSCRIPT_CANDIDATES);
    if (nextCandidates.length === 0) return;

    if (Platform.OS === 'ios') {
      const combined = combineCandidateSegments(completedCandidatesRef.current, nextCandidates);
      latestCandidatesRef.current = combined;
      setTranscript(combined[0] ?? '');
      if (event.isFinal) {
        completedCandidatesRef.current = combined;
        setFinalTranscript(combined[0] ?? '');
        setFinalTranscriptCandidates(combined);
      }
      return;
    }

    latestCandidatesRef.current = nextCandidates;
    setTranscript(nextCandidates[0] ?? '');
    if (event.isFinal) {
      completedCandidatesRef.current = nextCandidates;
      setFinalTranscript(nextCandidates[0] ?? '');
      setFinalTranscriptCandidates(nextCandidates);
    }
  });
  useSpeechRecognitionEvent('volumechange', (event) => setAudioLevel(event.value));
  useSpeechRecognitionEvent('nomatch', () => setError('No clear speech was recognized. Please try again.'));
  useSpeechRecognitionEvent('error', (event) => {
    const next = friendlyError(event.error, event.message);
    if (next) setError(next);
    setAudioLevel(-2);
  });
  useSpeechRecognitionEvent('end', () => {
    const latest = latestCandidatesRef.current;
    if (latest.length > 0) {
      setFinalTranscript((current) => (latest[0]?.length ?? 0) > current.length ? latest[0] : current);
      setFinalTranscriptCandidates((current) => latest[0]?.length > (current[0]?.length ?? 0) ? latest : current);
    }
    setAudioLevel(-2);
    setState('idle');
  });

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
        `[Cueback Speech] locale=en-US, onDevice=${supportsOnDevice}, platform=${Platform.OS}`,
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
    setFinalTranscriptCandidates([]);
    setAudioLevel(-2);
    completedCandidatesRef.current = [];
    latestCandidatesRef.current = [];
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
        maxAlternatives: MAX_TRANSCRIPT_CANDIDATES,
        continuous: Platform.OS === 'ios',
        requiresOnDeviceRecognition: canRunOnDevice,
        addsPunctuation: canRunOnDevice,
        iosTaskHint: 'dictation',
        volumeChangeEventOptions: {
          enabled: true,
          intervalMillis: 100,
        },
      });
    } catch (caught) {
      setState('idle');
      setError(caught instanceof Error ? caught.message : 'Couldn’t start speech recognition.');
    }
  }, [ensureAndroidOfflineEnglish, inspectRecognitionCapabilities]);

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
    state, transcript, finalTranscript, finalTranscriptCandidates, audioLevel,
    error, needsOfflineModel, modelDownloadMessage,
    onDeviceRecognitionSupported, englishLocaleSupported, recognitionMode,
    start, stop, downloadOfflineModel,
  };
}
