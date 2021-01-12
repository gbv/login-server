module.exports = {
  "env": {
    "es6": true
  },
  "extends": ["eslint:recommended"],
  "parserOptions": {
    "sourceType": "module",
    "ecmaVersion": 2017
  },
  "rules": {
    "indent": [
      "error",
      2
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "quotes": [
      "error",
      "double"
    ],
    "semi": [
      "error",
      "never"
    ],
    "no-undef": "off",
    "no-console": "off"
  }
}
