import type { Plugin } from '@envelop/core';
import type { GraphQLArmorCallbackConfiguration } from '@escape.tech/graphql-armor-types';
import { OperationDefinitionNode, ValidationContext } from 'graphql';
export type MaxDepthOptions = {
    n?: number;
    ignoreIntrospection?: boolean;
    flattenFragments?: boolean;
    exposeLimits?: boolean;
    errorMessage?: string;
} & GraphQLArmorCallbackConfiguration;
declare class MaxDepthVisitor {
    readonly OperationDefinition: Record<string, any>;
    private readonly context;
    private readonly config;
    private readonly visitedFragments;
    constructor(context: ValidationContext, options?: MaxDepthOptions);
    onOperationDefinitionEnter(operation: OperationDefinitionNode): void;
    private countDepth;
}
export declare const maxDepthRule: (options?: MaxDepthOptions) => (context: ValidationContext) => MaxDepthVisitor;
export declare const maxDepthPlugin: <PluginContext extends Record<string, any> = {}>(options?: MaxDepthOptions) => Plugin<PluginContext>;
export {};
