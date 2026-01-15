import { question as realityQuestion, template as realityTemplate } from "@reality.eth/reality-eth-lib";

/**
 * Reality.eth Utility Functions
 * 
 * Helper functions for encoding and parsing Reality.eth questions
 */

export type QuestionType = "bool" | "uint" | "single-select" | "multiple-select";

export interface QuestionData {
  type: QuestionType;
  title: string;
  outcomes?: string[]; // For select types
  category?: string;
  description?: string;
  language?: string;
}

/**
 * Encode question text for Reality.eth template
 * 
 * @param questionData - Question data to encode
 * @returns Encoded question text string
 */
export function encodeQuestionText(questionData: QuestionData): string {
  const { type, title, outcomes, category = "general", language = "en_US" } = questionData;

  if (type === "bool") {
    return realityQuestion.encodeText(type, title, null, category, language);
  }

  if (type === "single-select" || type === "multiple-select") {
    if (!outcomes || outcomes.length === 0) {
      throw new Error(`Outcomes are required for ${type} questions`);
    }
    return realityQuestion.encodeText(type, title, outcomes, category, language);
  }

  if (type === "uint") {
    return realityQuestion.encodeText(type, title, null, category, language);
  }

  throw new Error(`Unsupported question type: ${type}`);
}

/**
 * Parse question text from Reality.eth template
 * 
 * @param templateText - Template text from contract
 * @param questionText - Encoded question text
 * @returns Parsed question data object
 */
export function parseQuestionText(templateText: string, questionText: string) {
  try {
    return realityQuestion.populatedJSONForTemplate(templateText, questionText);
  } catch (error) {
    console.error("Error parsing question text:", error);
    throw new Error("Failed to parse question text");
  }
}

/**
 * Format question for display in UI
 * 
 * @param questionData - Parsed question data
 * @returns Formatted question object
 */
export function formatQuestionForDisplay(questionData: any) {
  return {
    title: questionData.title || "",
    type: questionData.type || "bool",
    outcomes: questionData.outcomes || [],
    category: questionData.category || "general",
    description: questionData.description || "",
  };
}

/**
 * Validate question data before submission
 * 
 * @param questionData - Question data to validate
 * @returns Validation result
 */
export function validateQuestionData(questionData: QuestionData): { valid: boolean; error?: string } {
  if (!questionData.title || questionData.title.trim().length === 0) {
    return { valid: false, error: "Question title is required" };
  }

  if (questionData.title.length > 200) {
    return { valid: false, error: "Question title must be 200 characters or less" };
  }

  if (questionData.type === "single-select" || questionData.type === "multiple-select") {
    if (!questionData.outcomes || questionData.outcomes.length < 2) {
      return { valid: false, error: "At least 2 outcomes are required for select questions" };
    }
    if (questionData.outcomes.length > 10) {
      return { valid: false, error: "Maximum 10 outcomes allowed" };
    }
  }

  return { valid: true };
}
