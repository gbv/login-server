module.exports = {
  "env": {
      "es6": true
  },
  "extends": ["eslint:recommended"],
  "parserOptions": {
      "sourceType": "module"
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
