import {
  createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';

import { createSamplePresentation, isReplaceableSamplePresentation } from '../data/sampleData';
import { SEMANTIC_MODEL_ID } from '../constants/semantic';
import { hashQuestionText } from '../services/semanticMatching';
import { EMPTY_APP_DATA, loadAppData, saveAppData } from '../storage/appStorage';
import { useSemanticModel } from './SemanticModelContext';
import type { AppData, PreparedQuestion, Presentation } from '../types/models';
import { createId } from '../utils/id';

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
  const [data, setData] = useState<AppData>(EMPTY_APP_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadAppData()
      .then((stored) => { if (active) setData(stored); })
      .catch((error: unknown) => { if (active) setLoadError(messageFromError(error)); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const persist = useCallback(async (next: AppData) => {
    await saveAppData(next);
    setData(next);
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
    await persist({ ...data, presentations: [presentation, ...data.presentations] });
    return presentation;
  }, [data, persist]);

  const renamePresentation = useCallback(async (id: string, title: string) => {
    await persist({
      ...data,
      presentations: data.presentations.map((item) => item.id === id
        ? { ...item, title: title.trim(), updatedAt: new Date().toISOString() }
        : item),
    });
  }, [data, persist]);

  const deletePresentation = useCallback(async (id: string) => {
    await persist({
      ...data,
      presentations: data.presentations.filter((item) => item.id !== id),
      questions: data.questions.filter((item) => item.presentationId !== id),
    });
  }, [data, persist]);

  const createQuestion = useCallback(async (presentationId: string, input: QuestionInput) => {
    const now = new Date().toISOString();
    const question = input.question.trim();
    const embeddingFields = await createEmbeddingFields(question);
    const item: PreparedQuestion = {
      id: createId('question'), presentationId, question,
      answer: input.answer.trim(), createdAt: now, updatedAt: now,
      ...embeddingFields,
    };
    await persist({ ...data, questions: [item, ...data.questions] });
    return item;
  }, [createEmbeddingFields, data, persist]);

  const updateQuestion = useCallback(async (id: string, input: QuestionInput) => {
    const question = input.question.trim();
    const embeddingFields = await createEmbeddingFields(question);
    await persist({
      ...data,
      questions: data.questions.map((item) => item.id === id ? {
        ...item,
        question,
        answer: input.answer.trim(),
        embedding: embeddingFields.embedding,
        embeddingModel: embeddingFields.embeddingModel,
        embeddingTextHash: embeddingFields.embeddingTextHash,
        updatedAt: new Date().toISOString(),
      } : item),
    });
  }, [createEmbeddingFields, data, persist]);

  const deleteQuestion = useCallback(async (id: string) => {
    await persist({ ...data, questions: data.questions.filter((item) => item.id !== id) });
  }, [data, persist]);

  const cacheQuestionEmbeddings = useCallback(async (
    updates: { id: string; embedding: number[]; embeddingTextHash: string }[],
  ) => {
    if (updates.length === 0) return;
    const byId = new Map(updates.map((item) => [item.id, item]));
    await persist({
      ...data,
      questions: data.questions.map((question) => {
        const update = byId.get(question.id);
        return update ? {
          ...question,
          embedding: update.embedding,
          embeddingModel: SEMANTIC_MODEL_ID,
          embeddingTextHash: update.embeddingTextHash,
        } : question;
      }),
    });
  }, [data, persist]);

  const addSamplePresentation = useCallback(async () => {
    const sample = createSamplePresentation();
    const replacedPresentationIds = new Set(
      data.presentations
        .filter((presentation) => isReplaceableSamplePresentation(presentation, data.questions))
        .map((presentation) => presentation.id),
    );
    await persist({
      ...data,
      presentations: [
        sample.presentation,
        ...data.presentations.filter((item) => !replacedPresentationIds.has(item.id)),
      ],
      questions: [
        ...sample.questions,
        ...data.questions.filter((item) => !replacedPresentationIds.has(item.presentationId)),
      ],
    });
    return sample.presentation;
  }, [data, persist]);

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
