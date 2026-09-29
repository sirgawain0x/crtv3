declare module "@reality.eth/reality-eth-lib/formatters/question.js" {
  export function encodeText(
    type: string,
    title: string,
    outcomes: string[] | null,
    category: string,
    language: string
  ): string;
  export function populatedJSONForTemplate(
    templateText: string,
    questionText: string
  ): Record<string, unknown>;
}

declare module "@reality.eth/reality-eth-lib/formatters/template.js" {
  export function defaultTemplateIDForType(templateType: string): number;
  export function defaultTemplateForType(templateType: string): string;
  export function preloadedTemplateContents(): Record<string, string>;
  export function preloadedTemplateContentsV32(): Record<string, string>;
}
