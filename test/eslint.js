const lint = require("mocha-eslint")

// ESLint as part of the tests
let paths = [
  "**/*.js",
  "!node_modules/**/*.js",
]
let options = {
  contextName: "ESLint",
}
lint(paths, options)
