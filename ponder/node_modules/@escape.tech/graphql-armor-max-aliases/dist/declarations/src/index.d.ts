import type { Plugin } from '@envelop/core';
import type { GraphQLArmorCallbackConfiguration } from '@escape.tech/graphql-armor-types';
import { OperationDefinitionNode, ValidationContext } from 'graphql';
type MaxAliasesOptions = {
    n?: number;
    allowList?: string[];
    exposeLimits?: boolean;
    errorMessage?: string;
} & GraphQLArmorCallbackConfiguration;
declare class MaxAliasesVisitor {
    readonly OperationDefinition: Record<string, any>;
    private readonly context;
    private readonly config;
    private readonly visitedFragments;
    constructor(context: ValidationContext, options?: MaxAliasesOptions);
    onOperationDefinitionEnter(operation: OperationDefinitionNode): void;
    private countAliases;
}
declare const maxAliasesRule: (options?: MaxAliasesOptions) => (context: ValidationContext) => MaxAliasesVisitor;
declare const maxAliasesPlugin: <PluginContext extends Record<string, any> = {}>(options?: MaxAliasesOptions) => Plugin<PluginContext>;
export { maxAliasesRule, maxAliasesPlugin, MaxAliasesOptions };
