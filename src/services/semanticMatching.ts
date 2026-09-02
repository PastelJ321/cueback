import {
  AUTO_MATCH_MIN_MARGIN,
  AUTO_MATCH_THRESHOLD,
  SEMANTIC_MODEL_ID,
  TOP_MATCH_COUNT,
} from '../constants/semantic';
import type { PreparedQuestion } from '../types/models';

export type SemanticMatch = {
  question: PreparedQuestion;
  score: number;
  transcript: string;
};

export type MatchResult = {
  matches: SemanticMatch[];
  confidentQuestionId: string | null;
  matchedTranscript: string;
  embeddingsToCache: { id: string; embedding: number[]; embeddingTextHash: string }[];
};

export function hashQuestionText(text: string): string {
  let hash = 2166136261;
  const normalized = text.trim().toLowerCase();
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hasCurrentEmbedding(item: PreparedQuestion): item is PreparedQuestion & { embedding: number[] } {
  return Boolean(
    item.embedding?.length &&
    item.embeddingModel === SEMANTIC_MODEL_ID &&
    item.embeddingTextHash === hashQuestionText(item.question),
  );
}

export function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length === 0 || left.length !== right.length) return -1;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }
  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator === 0 ? -1 : dot / denominator;
}

export async function findSemanticMatches(
  transcripts: string[],
  questions: PreparedQuestion[],
  embed: (text: string) => Promise<number[]>,
): Promise<MatchResult> {
  const candidates = [...new Set(transcripts.map((item) => item.trim()).filter(Boolean))].slice(0, 3);
  if (candidates.length === 0) throw new Error('No speech transcript was available for matching.');
  const transcriptEmbeddings = await Promise.all(candidates.map((candidate) => embed(candidate)));
  const embeddingsToCache: MatchResult['embeddingsToCache'] = [];
  const scored: SemanticMatch[] = [];

  for (const question of questions) {
    let embedding: number[];
    if (hasCurrentEmbedding(question)) {
      embedding = question.embedding;
    } else {
      embedding = await embed(question.question);
      embeddingsToCache.push({
        id: question.id,
        embedding,
        embeddingTextHash: hashQuestionText(question.question),
      });
    }
    let bestScore = -1;
    let bestTranscript = candidates[0];
    transcriptEmbeddings.forEach((transcriptEmbedding, index) => {
      const score = cosineSimilarity(transcriptEmbedding, embedding);
      if (score > bestScore) {
        bestScore = score;
        bestTranscript = candidates[index];
      }
    });
    scored.push({ question, score: bestScore, transcript: bestTranscript });
  }

  const matches = scored.sort((a, b) => b.score - a.score).slice(0, TOP_MATCH_COUNT);
  const best = matches[0];
  const runnerUp = matches[1];
  const clearsThreshold = Boolean(best && best.score >= AUTO_MATCH_THRESHOLD);
  const hasEnoughMargin = !runnerUp || best.score - runnerUp.score >= AUTO_MATCH_MIN_MARGIN;

  return {
    matches,
    confidentQuestionId: clearsThreshold && hasEnoughMargin ? best.question.id : null,
    matchedTranscript: best?.transcript ?? candidates[0],
    embeddingsToCache,
  };
}
