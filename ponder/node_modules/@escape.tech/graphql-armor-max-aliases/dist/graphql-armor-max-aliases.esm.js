import { GraphQLError, Kind } from 'graphql';

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

const maxAliasesDefaultOptions = {
  n: 15,
  allowList: ['__typename'],
  exposeLimits: true,
  errorMessage: 'Query validation error.',
  onAccept: [],
  onReject: [],
  propagateOnRejection: true
};
class MaxAliasesVisitor {
  constructor(context, options) {
    _defineProperty(this, "OperationDefinition", void 0);
    _defineProperty(this, "context", void 0);
    _defineProperty(this, "config", void 0);
    _defineProperty(this, "visitedFragments", void 0);
    this.context = context;
    this.config = Object.assign({}, maxAliasesDefaultOptions, ...Object.entries(options !== null && options !== void 0 ? options : {}).map(([k, v]) => v === undefined ? {} : {
      [k]: v
    }));
    this.visitedFragments = new Map();
    this.OperationDefinition = {
      enter: this.onOperationDefinitionEnter.bind(this)
    };
  }
  onOperationDefinitionEnter(operation) {
    const aliases = this.countAliases(operation);
    if (aliases > this.config.n) {
      const message = this.config.exposeLimits ? `Aliases limit of ${this.config.n} exceeded, found ${aliases}.` : this.config.errorMessage;
      const err = new GraphQLError(`Syntax Error: ${message}`);
      for (const handler of this.config.onReject) {
        handler(this.context, err);
      }
      if (this.config.propagateOnRejection) {
        throw err;
      }
    } else {
      for (const handler of this.config.onAccept) {
        handler(this.context, {
          n: aliases
        });
      }
    }
  }
  countAliases(node) {
    let aliases = 0;
    if ('alias' in node && node.alias && !this.config.allowList.includes(node.alias.value) && !this.config.allowList.includes(node.name.value)) {
      ++aliases;
    }
    if ('selectionSet' in node && node.selectionSet) {
      for (const child of node.selectionSet.selections) {
        aliases += this.countAliases(child);
      }
    } else if (node.kind === Kind.FRAGMENT_SPREAD) {
      if (this.visitedFragments.has(node.name.value)) {
        var _this$visitedFragment;
        return (_this$visitedFragment = this.visitedFragments.get(node.name.value)) !== null && _this$visitedFragment !== void 0 ? _this$visitedFragment : 0;
      } else {
        this.visitedFragments.set(node.name.value, -1);
      }
      const fragment = this.context.getFragment(node.name.value);
      if (fragment) {
        const additionalAliases = this.countAliases(fragment);
        if (this.visitedFragments.get(node.name.value) === -1) {
          this.visitedFragments.set(node.name.value, additionalAliases);
        }
        aliases += additionalAliases;
      }
    }
    return aliases;
  }
}
const maxAliasesRule = options => context => new MaxAliasesVisitor(context, options);
const maxAliasesPlugin = options => {
  return {
    onValidate({
      addValidationRule
    }) {
      addValidationRule(maxAliasesRule(options));
    }
  };
};

export { maxAliasesPlugin, maxAliasesRule };
