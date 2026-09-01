import { useCallback, useState } from 'react';

import { findSemanticMatches, type SemanticMatch } from '../services/semanticMatching';
import { useAppData } from '../state/AppDataContext';
import { useSemanticModel } from '../state/SemanticModelContext';
import type { PreparedQuestion } from '../types/models';

export function useSemanticMatcher(questions: PreparedQuestion[]) {
  const semantic = useSemanticModel();
  const { cacheQuestionEmbeddings } = useAppData();
  const [matches, setMatches] = useState<SemanticMatch[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [wasAutoSelected, setWasAutoSelected] = useState(false);

  const match = useCallback(async (transcript: string) => {
    if (!transcript.trim() || questions.length === 0) return;
    if (!semantic.isReady) {
      setMatchError('The semantic model is still loading. Matching will start when it is ready.');
      return;
    }
    setIsMatching(true);
    setMatchError(null);
    try {
      const result = await findSemanticMatches(transcript, questions, semantic.embed);
      setMatches(result.matches);
      setSelectedQuestionId(result.confidentQuestionId);
      setWasAutoSelected(Boolean(result.confidentQuestionId));
      await cacheQuestionEmbeddings(result.embeddingsToCache);
    } catch (caught) {
      setMatchError(caught instanceof Error ? caught.message : 'On-device semantic matching failed.');
    } finally {
      setIsMatching(false);
    }
  }, [cacheQuestionEmbeddings, questions, semantic.embed, semantic.isReady]);

  const select = useCallback((questionId: string) => {
    setSelectedQuestionId(questionId);
    setWasAutoSelected(false);
  }, []);

  const reset = useCallback(() => {
    setMatches([]);
    setSelectedQuestionId(null);
    setWasAutoSelected(false);
    setMatchError(null);
    setIsMatching(false);
  }, []);

  return {
    ...semantic,
    matches,
    selectedQuestionId,
    selectedQuestion: questions.find((question) => question.id === selectedQuestionId) ?? null,
    isMatching,
    matchError,
    wasAutoSelected,
    match,
    select,
    reset,
  };
}
