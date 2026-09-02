import { isAvailable, models, useTextEmbeddings } from 'react-native-executorch';
import {
  createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState,
} from 'react';
import { Platform } from 'react-native';

type SemanticModelValue = {
  isReady: boolean;
  isGenerating: boolean;
  downloadProgress: number;
  error: string | null;
  embed: (text: string) => Promise<number[]>;
  retry: () => void;
};

const SemanticModelContext = createContext<SemanticModelValue | null>(null);

function SemanticEngine({ children, retry }: PropsWithChildren<{ retry: () => void }>) {
  const model = useMemo(() => models.text_embedding.paraphrase_multilingual_minilm_l12_v2(), []);
  const embeddings = useTextEmbeddings({ model, preventLoad: !isAvailable });
  const embed = useCallback(async (text: string) => Array.from(await embeddings.forward(text)), [embeddings]);
  const value = useMemo<SemanticModelValue>(() => ({
    isReady: embeddings.isReady,
    isGenerating: embeddings.isGenerating,
    downloadProgress: embeddings.downloadProgress,
    error: !isAvailable
      ? `On-device ExecuTorch is unavailable on this ${Platform.OS === 'ios' ? 'iOS device' : 'Android version or CPU architecture'}.`
      : embeddings.error?.message ?? null,
    embed,
    retry,
  }), [embeddings.isReady, embeddings.isGenerating, embeddings.downloadProgress, embeddings.error, embed, retry]);
  return <SemanticModelContext.Provider value={value}>{children}</SemanticModelContext.Provider>;
}

export function SemanticModelProvider({ children }: PropsWithChildren) {
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  return <SemanticEngine key={attempt} retry={retry}>{children}</SemanticEngine>;
}

export function useSemanticModel(): SemanticModelValue {
  const value = useContext(SemanticModelContext);
  if (!value) throw new Error('useSemanticModel must be used inside SemanticModelProvider.');
  return value;
}
