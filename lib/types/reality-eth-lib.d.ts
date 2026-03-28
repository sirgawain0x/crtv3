declare module '@reality.eth/reality-eth-lib' {
  interface QuestionUtils {
    encodeText(
      type: string,
      title: string,
      outcomes: string[] | null,
      category: string,
      language: string
    ): string;
    populatedJSONForTemplate(templateText: string, questionText: string): any;
  }

  interface TemplateUtils {
    [key: string]: any;
  }

  export const question: QuestionUtils;
  export const template: TemplateUtils;
}
