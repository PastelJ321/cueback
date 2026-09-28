import type { PreparedQuestion, Presentation } from '../types/models';
import { createId } from '../utils/id';

export const SAMPLE_PRESENTATION_KEY = 'wharton-2026-2027-v1';

const SAMPLE_ITEMS = [
  {
    question: "What is the client's primary investment objective?",
    answer: "The client is investing capital that will eventually fund a healthcare-and-technology startup. Our objective is therefore to grow that capital while protecting its ability to serve as future startup funding.",
  },
  {
    question: 'Why did you exclude bonds from the portfolio?',
    answer: 'We excluded bonds because the client needs stronger capital growth than we believe a bond allocation would provide. Instead, we control risk through cash, position limits, resilient businesses, and diversification across industries and countries.',
  },
  {
    question: 'How do you control downside risk while still pursuing high returns?',
    answer: 'We combine equity upside with several layers of protection: 25 percent cash, positions below 10 percent, geographic diversification across the United States, Japan, and Europe, and exposure to different industries with resilient earnings or revenue.',
  },
  {
    question: 'Why is 25 percent of the portfolio held in cash?',
    answer: 'Technology valuations create a meaningful risk of correction. Cash limits near-term downside and gives us dry powder to add progressively to selected high-quality big technology companies at more attractive prices when corrections occur.',
  },
  {
    question: 'Why did you select the United States, Japan, and Europe?',
    answer: 'Each region provides a different source of return: American technology and consumer businesses, Japanese industrial companies, and European financial and healthcare companies. Combining them reduces dependence on one economy, market structure, or geopolitical outcome.',
  },
  {
    question: "How did the client's background influence the technology allocation?",
    answer: 'The client understands technology and believes in its long-term integration with healthcare, so we included American big technology companies. However, the client’s career and future startup already create technology exposure, so we deliberately limited the allocation to avoid overlapping human and financial capital.',
  },
  {
    question: 'Why include European healthcare companies?',
    answer: 'European healthcare adds geographic and industry diversification, and selected companies are actively connecting information technology with medicine. This reflects the client’s entrepreneurial philosophy without concentrating all related exposure in American technology.',
  },
  {
    question: 'Why invest in American consumer companies?',
    answer: 'We favored American consumer companies with strong operating results and comparatively stable share prices despite market uncertainty. They provide a more defensive component within the equity allocation, while keeping each position below 10 percent limits company-specific risk.',
  },
  {
    question: 'Why invest in Japanese industrial companies?',
    answer: 'Selected Japanese industrial companies offer stable business-to-business revenue that can be more resilient during uncertain markets. They also diversify the portfolio away from American technology and consumer exposure, both industrially and geographically.',
  },
  {
    question: 'Why include European financial companies?',
    answer: 'European financial companies add a return driver that differs from technology, healthcare, consumer, and industrial holdings. Their inclusion broadens both sector and regional exposure, reducing reliance on the client’s areas of professional interest.',
  },
] as const;

export function isReplaceableSamplePresentation(
  presentation: Presentation,
  questions: PreparedQuestion[],
): boolean {
  if (presentation.sampleKey !== SAMPLE_PRESENTATION_KEY || presentation.title !== '2026–2027 Wharton Investment Competition') return false;
  const presentationQuestions = questions.filter((item) => item.presentationId === presentation.id);
  const expected = SAMPLE_ITEMS.slice(0, presentationQuestions.length);
  return (presentationQuestions.length === SAMPLE_ITEMS.length || presentationQuestions.length === 5)
    && presentationQuestions.every((item, index) => item.question === expected[index].question && item.answer === expected[index].answer);
}

export function createSamplePresentation(): { presentation: Presentation; questions: PreparedQuestion[] } {
  const now = new Date().toISOString();
  const presentationId = createId('presentation');
  const presentation: Presentation = {
    id: presentationId,
    title: '2026–2027 Wharton Investment Competition',
    sampleKey: SAMPLE_PRESENTATION_KEY,
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
