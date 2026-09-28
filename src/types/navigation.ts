export type RootStackParamList = {
  Presentations: undefined;
  QuestionBank: { presentationId: string };
  QuestionEditor: { presentationId: string; questionId?: string };
  LiveQA: { presentationId: string };
  Pro: undefined;
};
