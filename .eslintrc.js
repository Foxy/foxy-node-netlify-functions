module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: "@foxy.io",
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "no-underscore-dangle": false
  },
};
