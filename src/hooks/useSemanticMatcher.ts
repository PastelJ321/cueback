import { useCallback, useEffect, useRef, useState } from 'react';

import { findSemanticMatches, type SemanticMatch } from '../services/semanticMatching';
import { useAppData } from '../state/AppDataContext';
import { useSemanticModel } from '../state/SemanticModelContext';
import type { PreparedQuestion } from '../types/models';
import { hashQuestionText } from '../services/semanticMatching';

export function useSemanticMatcher(questions: PreparedQuestion[]) {
  const semantic = useSemanticModel();
  const { cacheQuestionEmbeddings } = useAppData();
  const [matches, setMatches] = useState<SemanticMatch[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [wasAutoSelected, setWasAutoSelected] = useState(false);
  const [matchedTranscript, setMatchedTranscript] = useState('');
  const [hasCompletedMatch, setHasCompletedMatch] = useState(false);
  const requestId = useRef(0);
  const activeKey = useRef('');
  const questionSignature = questions.map((item) => `${item.id}:${hashQuestionText(item.question)}`).join('|');

  useEffect(() => {
    requestId.current += 1;
    activeKey.current = '';
    setMatches([]);
    setSelectedQuestionId(null);
    setHasCompletedMatch(false);
    setIsMatching(false);
  }, [questionSignature]);

  const match = useCallback(async (transcripts: string[]) => {
    if (!transcripts.some((item) => item.trim())) return;
    const key = JSON.stringify(transcripts.map((item) => item.trim())) + questionSignature;
    if (activeKey.current === key) return;
    if (questions.length === 0) {
      setHasCompletedMatch(true);
      return;
    }
    if (!semantic.isReady) {
      setMatchError('The semantic model is still loading. Matching will start when it is ready.');
      return;
    }
    activeKey.current = key;
    const currentRequest = ++requestId.current;
    setIsMatching(true);
    setHasCompletedMatch(false);
    setMatchError(null);
    try {
      const result = await findSemanticMatches(transcripts, questions, semantic.embed);
      if (requestId.current !== currentRequest) return;
      setMatches(result.matches);
      setSelectedQuestionId(result.confidentQuestionId);
      setWasAutoSelected(Boolean(result.confidentQuestionId));
      setMatchedTranscript(result.matchedTranscript);
      // Cache persistence is secondary to showing the prepared answer.
      void cacheQuestionEmbeddings(result.embeddingsToCache).catch(() => undefined);
    } catch (caught) {
      if (requestId.current === currentRequest) setMatchError(caught instanceof Error ? caught.message : 'On-device semantic matching failed.');
    } finally {
      if (requestId.current === currentRequest) {
        setIsMatching(false);
        setHasCompletedMatch(true);
      }
    }
  }, [cacheQuestionEmbeddings, questionSignature, questions, semantic.embed, semantic.isReady]);

  const select = useCallback((questionId: string) => {
    setSelectedQuestionId(questionId);
    setWasAutoSelected(false);
    setMatchedTranscript('');
  }, []);

  const reset = useCallback(() => {
    requestId.current += 1;
    activeKey.current = '';
    setMatches([]);
    setSelectedQuestionId(null);
    setWasAutoSelected(false);
    setMatchError(null);
    setIsMatching(false);
    setMatchedTranscript('');
    setHasCompletedMatch(false);
  }, []);

  return {
    ...semantic,
    matches,
    selectedQuestionId,
    selectedQuestion: questions.find((question) => question.id === selectedQuestionId) ?? null,
    isMatching,
    matchError,
    wasAutoSelected,
    matchedTranscript,
    hasCompletedMatch,
    match,
    select,
    reset,
  };
}
