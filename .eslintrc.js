module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: [
    "@foxy.io",
    "plugin:jsdoc/recommended"
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "no-underscore-dangle": 0
  },
};
