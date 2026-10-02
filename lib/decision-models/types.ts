/** Question types for TypeSafe `/v1/systemone` (Jev / System One API). */

export type SystemOneQuestionType = "choice" | "noul" | "score";

export type ChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
};

export type NoulQuestion = {
  type: "noul";
  instructions: string;
  criteria?: { true?: string; false?: string };
};

export type ScoreQuestion = {
  type: "score";
  instructions: string;
  /** Level descriptions, lowest first. */
  criteria: string[];
};

export type SystemOneQuestion = ChoiceQuestion | NoulQuestion | ScoreQuestion;

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  probabilities?: Record<string, number>;
  confidence?: number;
};

export type NoulAnswer = {
  type: "noul";
  /** Probability that the answer is true (0–1). */
  noul: number;
};

export type ScoreAnswer = {
  type: "score";
  score: number;
  legend?: Record<string, string>;
  probabilities?: Record<string, number>;
  confidence?: number;
};

export type SystemOneAnswer = ChoiceAnswer | NoulAnswer | ScoreAnswer;

export type SystemOneRequest = {
  model: string;
  state: string | Record<string, unknown> | unknown[];
  questions: Record<string, SystemOneQuestion>;
  keep_alive?: string | number;
};

export type SystemOneResponse = {
  model: string;
  answers: Record<string, SystemOneAnswer>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export class DecisionModelError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "DecisionModelError";
  }
}
