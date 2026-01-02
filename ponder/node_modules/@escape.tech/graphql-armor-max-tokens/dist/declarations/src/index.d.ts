import { Plugin } from '@envelop/types';
import type { GraphQLArmorCallbackConfiguration } from '@escape.tech/graphql-armor-types';
import { Source } from 'graphql';
import { ParseOptions, Parser } from 'graphql/language/parser';
type maxTokensParserWLexerOptions = ParseOptions & {
    n: number;
    exposeLimits?: boolean;
    errorMessage?: string;
} & GraphQLArmorCallbackConfiguration;
export type MaxTokensOptions = {
    n?: number;
    exposeLimits?: boolean;
    errorMessage?: string;
} & GraphQLArmorCallbackConfiguration;
export declare const maxTokenDefaultOptions: Required<MaxTokensOptions>;
export declare class MaxTokensParserWLexer extends Parser {
    private _tokenCount;
    private readonly config;
    get tokenCount(): number;
    constructor(source: string | Source, options?: maxTokensParserWLexerOptions);
}
export declare function maxTokensPlugin<PluginContext extends Record<string, any> = {}>(config?: MaxTokensOptions): Plugin<PluginContext>;
export {};
