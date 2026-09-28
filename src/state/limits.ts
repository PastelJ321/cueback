import type { AppData } from '../types/models';

export const FREE_PRESENTATION_LIMIT = 1;
export const FREE_QUESTION_LIMIT = 5;

export class ProRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProRequiredError';
  }
}

export function assertCanAddPresentation(data: AppData, isPro: boolean): void {
  if (!isPro && data.presentations.length >= FREE_PRESENTATION_LIMIT) {
    throw new ProRequiredError('Free includes one presentation. Open Cueback Pro for unlimited presentations.');
  }
}

export function assertCanAddQuestion(data: AppData, presentationId: string, isPro: boolean): void {
  if (!data.presentations.some((item) => item.id === presentationId)) {
    throw new Error('Presentation no longer exists.');
  }
  if (!isPro && data.questions.filter((item) => item.presentationId === presentationId).length >= FREE_QUESTION_LIMIT) {
    throw new ProRequiredError('Free includes five questions per presentation. Open Cueback Pro for unlimited questions.');
  }
}
