import {
  createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';

import { createSamplePresentation, isReplaceableSamplePresentation } from '../data/sampleData';
import { SEMANTIC_MODEL_ID } from '../constants/semantic';
import { hashQuestionText } from '../services/semanticMatching';
import { EMPTY_APP_DATA, loadAppData, saveAppData } from '../storage/appStorage';
import { useSemanticModel } from './SemanticModelContext';
import type { AppData, PreparedQuestion, Presentation } from '../types/models';
import { createId } from '../utils/id';
import { AppDataStore } from './appDataStore';
import { assertCanAddPresentation, assertCanAddQuestion, FREE_QUESTION_LIMIT } from './limits';
import { usePurchases } from './PurchasesContext';

type QuestionInput = { question: string; answer: string };
type AppDataContextValue = {
  data: AppData;
  isLoading: boolean;
  loadError: string | null;
  createPresentation: (title: string) => Promise<Presentation>;
  renamePresentation: (id: string, title: string) => Promise<void>;
  deletePresentation: (id: string) => Promise<void>;
  createQuestion: (presentationId: string, input: QuestionInput) => Promise<PreparedQuestion>;
  updateQuestion: (id: string, input: QuestionInput) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  cacheQuestionEmbeddings: (updates: { id: string; embedding: number[]; embeddingTextHash: string }[]) => Promise<void>;
  addSamplePresentation: () => Promise<Presentation>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected local storage error occurred.';
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const semanticModel = useSemanticModel();
  const { isPro } = usePurchases();
  const isProRef = useRef(isPro);
  isProRef.current = isPro;
  const [data, setData] = useState<AppData>(EMPTY_APP_DATA);
  const storeRef = useRef<AppDataStore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadAppData()
      .then((stored) => {
        if (active) {
          storeRef.current = new AppDataStore(stored, saveAppData, setData);
          setData(stored);
        }
      })
      .catch((error: unknown) => { if (active) setLoadError(messageFromError(error)); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const mutate = useCallback(<T,>(change: (latest: AppData) => { next: AppData; result: T }) => {
    if (!storeRef.current) return Promise.reject(new Error('Local data is not ready.'));
    return storeRef.current.update(change);
  }, []);

  const createEmbeddingFields = useCallback(async (question: string) => {
    if (!semanticModel.isReady || semanticModel.isGenerating) return {};
    try {
      return {
        embedding: await semanticModel.embed(question),
        embeddingModel: SEMANTIC_MODEL_ID,
        embeddingTextHash: hashQuestionText(question),
      };
    } catch {
      return {};
    }
  }, [semanticModel]);

  const createPresentation = useCallback(async (title: string) => {
    const now = new Date().toISOString();
    const presentation: Presentation = {
      id: createId('presentation'), title: title.trim(), createdAt: now, updatedAt: now,
    };
    return mutate((latest) => {
      assertCanAddPresentation(latest, isProRef.current);
      return { next: { ...latest, presentations: [presentation, ...latest.presentations] }, result: presentation };
    });
  }, [mutate]);

  const renamePresentation = useCallback(async (id: string, title: string) => {
    await mutate((latest) => {
      if (!latest.presentations.some((item) => item.id === id)) throw new Error('Presentation no longer exists.');
      return { next: {
      ...latest,
      presentations: latest.presentations.map((item) => item.id === id
        ? { ...item, title: title.trim(), updatedAt: new Date().toISOString() }
        : item),
    }, result: undefined };
    });
  }, [mutate]);

  const deletePresentation = useCallback(async (id: string) => {
    await mutate((latest) => ({ next: {
      ...latest,
      presentations: latest.presentations.filter((item) => item.id !== id),
      questions: latest.questions.filter((item) => item.presentationId !== id),
    }, result: undefined }));
  }, [mutate]);

  const createQuestion = useCallback(async (presentationId: string, input: QuestionInput) => {
    const now = new Date().toISOString();
    const question = input.question.trim();
    const embeddingFields = await createEmbeddingFields(question);
    const item: PreparedQuestion = {
      id: createId('question'), presentationId, question,
      answer: input.answer.trim(), createdAt: now, updatedAt: now,
      ...embeddingFields,
    };
    return mutate((latest) => {
      assertCanAddQuestion(latest, presentationId, isProRef.current);
      return { next: { ...latest, questions: [item, ...latest.questions] }, result: item };
    });
  }, [createEmbeddingFields, mutate]);

  const updateQuestion = useCallback(async (id: string, input: QuestionInput) => {
    const question = input.question.trim();
    const embeddingFields = await createEmbeddingFields(question);
    await mutate((latest) => {
      if (!latest.questions.some((item) => item.id === id)) throw new Error('Question no longer exists.');
      return { next: {
      ...latest,
      questions: latest.questions.map((item) => item.id === id ? {
        ...item,
        question,
        answer: input.answer.trim(),
        embedding: embeddingFields.embedding,
        embeddingModel: embeddingFields.embeddingModel,
        embeddingTextHash: embeddingFields.embeddingTextHash,
        updatedAt: new Date().toISOString(),
      } : item),
    }, result: undefined };
    });
  }, [createEmbeddingFields, mutate]);

  const deleteQuestion = useCallback(async (id: string) => {
    await mutate((latest) => ({ next: { ...latest, questions: latest.questions.filter((item) => item.id !== id) }, result: undefined }));
  }, [mutate]);

  const cacheQuestionEmbeddings = useCallback(async (
    updates: { id: string; embedding: number[]; embeddingTextHash: string }[],
  ) => {
    if (updates.length === 0) return;
    const byId = new Map(updates.map((item) => [item.id, item]));
    await mutate((latest) => ({ next: {
      ...latest,
      questions: latest.questions.map((question) => {
        const update = byId.get(question.id);
        return update && hashQuestionText(question.question) === update.embeddingTextHash ? {
          ...question,
          embedding: update.embedding,
          embeddingModel: SEMANTIC_MODEL_ID,
          embeddingTextHash: update.embeddingTextHash,
        } : question;
      }),
    }, result: undefined }));
  }, [mutate]);

  const addSamplePresentation = useCallback(async () => {
    const sample = createSamplePresentation();
    return mutate((latest) => {
      const replacedPresentationIds = new Set(
        latest.presentations
          .filter((presentation) => isReplaceableSamplePresentation(presentation, latest.questions))
          .map((presentation) => presentation.id),
      );
      const existingSample = latest.presentations.find((item) => replacedPresentationIds.has(item.id));
      if (!isProRef.current && existingSample && latest.questions.filter((item) => item.presentationId === existingSample.id).length > FREE_QUESTION_LIMIT) {
        // Older Pro or pre-limit sample data remains available after entitlement expiry.
        return { next: latest, result: existingSample };
      }
      if (replacedPresentationIds.size === 0) assertCanAddPresentation(latest, isProRef.current);
      const sampleQuestions = isProRef.current ? sample.questions : sample.questions.slice(0, FREE_QUESTION_LIMIT);
      return { next: {
      ...latest,
      presentations: [
        sample.presentation,
        ...latest.presentations.filter((item) => !replacedPresentationIds.has(item.id)),
      ],
      questions: [
        ...sampleQuestions,
        ...latest.questions.filter((item) => !replacedPresentationIds.has(item.presentationId)),
      ],
    }, result: sample.presentation };
    });
  }, [mutate]);

  const value = useMemo<AppDataContextValue>(() => ({
    data, isLoading, loadError, createPresentation, renamePresentation, deletePresentation,
    createQuestion, updateQuestion, deleteQuestion, cacheQuestionEmbeddings, addSamplePresentation,
  }), [data, isLoading, loadError, createPresentation, renamePresentation, deletePresentation,
    createQuestion, updateQuestion, deleteQuestion, cacheQuestionEmbeddings, addSamplePresentation]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const value = useContext(AppDataContext);
  if (!value) throw new Error('useAppData must be used inside AppDataProvider.');
  return value;
}
