import type { PreparedQuestion, Presentation } from '../types/models';
import { createId } from '../utils/id';

const SAMPLE_ITEMS = [
  { question: 'Why did you choose this benchmark?', answer: "We chose this benchmark because it better reflects our client's objectives and the structure of our portfolio." },
  { question: "How did you assess the client's risk tolerance?", answer: "We considered both the client's financial capital and human capital when determining an appropriate level of risk." },
  { question: 'Why did you invest in technology?', answer: "We saw long-term growth opportunities, but limited the allocation because the client's human capital already creates exposure to the sector." },
  { question: 'How is the portfolio diversified?', answer: 'We diversified across sectors and asset types to reduce concentration risk while preserving our highest-conviction ideas.' },
] as const;

export function createSamplePresentation(): { presentation: Presentation; questions: PreparedQuestion[] } {
  const now = new Date().toISOString();
  const presentationId = createId('presentation');
  const presentation: Presentation = {
    id: presentationId,
    title: 'Wharton Investment Competition',
    createdAt: now,
    updatedAt: now,
  };
  return {
    presentation,
    questions: SAMPLE_ITEMS.map((item) => ({
      id: createId('question'), presentationId, question: item.question, answer: item.answer,
      createdAt: now, updatedAt: now,
    })),
  };
}
