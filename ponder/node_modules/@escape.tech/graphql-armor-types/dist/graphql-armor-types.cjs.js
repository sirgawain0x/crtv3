'use strict';

if (process.env.NODE_ENV === "production") {
  module.exports = require("./graphql-armor-types.cjs.prod.js");
} else {
  module.exports = require("./graphql-armor-types.cjs.dev.js");
}
