import { TokenKind, GraphQLError } from 'graphql';
import { Parser } from 'graphql/language/parser';

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

const maxTokenDefaultOptions = {
  n: 1000,
  exposeLimits: true,
  errorMessage: 'Query validation error.',
  onAccept: [],
  onReject: [],
  propagateOnRejection: true
};
class MaxTokensParserWLexer extends Parser {
  get tokenCount() {
    return this._tokenCount;
  }
  constructor(source, options) {
    super(source, options);
    _defineProperty(this, "_tokenCount", 0);
    _defineProperty(this, "config", void 0);
    this.config = Object.assign({}, maxTokenDefaultOptions, ...Object.entries(options !== null && options !== void 0 ? options : {}).map(([k, v]) => v === undefined ? {} : {
      [k]: v
    }));
    const lexer = this._lexer;
    this._lexer = new Proxy(lexer, {
      get: (target, prop, receiver) => {
        if (prop === 'advance') {
          return () => {
            const token = target.advance();
            if (token.kind !== TokenKind.EOF) {
              this._tokenCount++;
            }
            if (this._tokenCount > this.config.n) {
              const message = this.config.exposeLimits ? `Token limit of ${this.config.n} exceeded.` : this.config.errorMessage;
              const err = new GraphQLError(`Syntax Error: ${message}`);
              for (const handler of this.config.onReject) {
                handler(null, err);
              }
              if (this.config.propagateOnRejection) {
                throw err;
              }
            }
            for (const handler of this.config.onAccept) {
              handler(null, {
                n: this._tokenCount
              });
            }
            return token;
          };
        }
        return Reflect.get(target, prop, receiver);
      }
    });
  }
}
function maxTokensPlugin(config) {
  function parseWithTokenLimit(source, options) {
    // @ts-expect-error TODO(@c3b5aw): address the type issue
    const parser = new MaxTokensParserWLexer(source, Object.assign({}, options, config));
    return parser.parseDocument();
  }
  return {
    onParse({
      setParseFn
    }) {
      setParseFn(parseWithTokenLimit);
    }
  };
}

export { MaxTokensParserWLexer, maxTokenDefaultOptions, maxTokensPlugin };
