'use strict';

if (process.env.NODE_ENV === "production") {
  module.exports = require("./graphql-armor-max-depth.cjs.prod.js");
} else {
  module.exports = require("./graphql-armor-max-depth.cjs.dev.js");
}
