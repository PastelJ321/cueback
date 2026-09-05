export type Presentation = {
  id: string;
  title: string;
  sampleKey?: string;
  createdAt: string;
  updatedAt: string;
};

export type PreparedQuestion = {
  id: string;
  presentationId: string;
  question: string;
  answer: string;
  embedding?: number[];
  embeddingModel?: string;
  embeddingTextHash?: string;
  createdAt: string;
  updatedAt: string;
};

export type AppData = {
  version: 1;
  presentations: Presentation[];
  questions: PreparedQuestion[];
};
