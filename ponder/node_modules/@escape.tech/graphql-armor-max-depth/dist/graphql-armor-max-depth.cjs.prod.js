'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var graphql = require('graphql');

function _toPrimitive(input, hint) {
  if (typeof input !== "object" || input === null) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== undefined) {
    var res = prim.call(input, hint || "default");
    if (typeof res !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}

function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, "string");
  return typeof key === "symbol" ? key : String(key);
}

function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}

const maxDepthDefaultOptions = {
  n: 6,
  ignoreIntrospection: true,
  flattenFragments: false,
  exposeLimits: true,
  errorMessage: 'Query validation error.',
  onAccept: [],
  onReject: [],
  propagateOnRejection: true
};
class MaxDepthVisitor {
  constructor(context, options) {
    _defineProperty(this, "OperationDefinition", void 0);
    _defineProperty(this, "context", void 0);
    _defineProperty(this, "config", void 0);
    _defineProperty(this, "visitedFragments", void 0);
    this.context = context;
    this.config = Object.assign({}, maxDepthDefaultOptions, ...Object.entries(options !== null && options !== void 0 ? options : {}).map(([k, v]) => v === undefined ? {} : {
      [k]: v
    }));
    this.visitedFragments = new Map();
    this.OperationDefinition = {
      enter: this.onOperationDefinitionEnter
    };
  }
  onOperationDefinitionEnter(operation) {
    const depth = this.countDepth(operation);
    if (depth > this.config.n) {
      const message = this.config.exposeLimits ? `Query depth limit of ${this.config.n} exceeded, found ${depth}.` : this.config.errorMessage;
      const err = new graphql.GraphQLError(`Syntax Error: ${message}`);
      for (const handler of this.config.onReject) {
        handler(this.context, err);
      }
      if (this.config.propagateOnRejection) {
        throw err;
      }
    } else {
      for (const handler of this.config.onAccept) {
        handler(this.context, {
          n: depth
        });
      }
    }
  }
  countDepth(node, parentDepth = 0) {
    if (this.config.ignoreIntrospection && 'name' in node && node.name?.value === '__schema' && node.kind === graphql.Kind.FIELD) {
      return 0;
    }
    let depth = parentDepth;
    if ('selectionSet' in node && node.selectionSet) {
      for (const child of node.selectionSet.selections) {
        if (this.config.flattenFragments && (child.kind === graphql.Kind.INLINE_FRAGMENT || child.kind === graphql.Kind.FRAGMENT_SPREAD)) {
          depth = Math.max(depth, this.countDepth(child, parentDepth));
        } else {
          depth = Math.max(depth, this.countDepth(child, parentDepth + 1));
        }
      }
    } else if (node.kind == graphql.Kind.FRAGMENT_SPREAD) {
      if (!this.config.flattenFragments) {
        parentDepth += 1;
      }
      if (this.visitedFragments.has(node.name.value)) {
        var _this$visitedFragment;
        return parentDepth + ((_this$visitedFragment = this.visitedFragments.get(node.name.value)) !== null && _this$visitedFragment !== void 0 ? _this$visitedFragment : 0);
      } else {
        this.visitedFragments.set(node.name.value, -1);
      }
      const fragment = this.context.getFragment(node.name.value);
      if (fragment) {
        let fragmentDepth = this.countDepth(fragment, 0);
        depth = Math.max(depth, parentDepth + fragmentDepth);
        if (this.visitedFragments.get(node.name.value) === -1) {
          this.visitedFragments.set(node.name.value, fragmentDepth);
        }
      }
    }
    return depth;
  }
}
const maxDepthRule = options => context => new MaxDepthVisitor(context, options);
const maxDepthPlugin = options => {
  return {
    onValidate({
      addValidationRule
    }) {
      addValidationRule(maxDepthRule(options));
    }
  };
};

exports.maxDepthPlugin = maxDepthPlugin;
exports.maxDepthRule = maxDepthRule;
