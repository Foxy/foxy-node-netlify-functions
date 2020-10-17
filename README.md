# Netlify Serverless Functions for the Foxy.io API

This repository allows for easily creating serverless functions to work with the Foxy.io API, deployed using Netlify. The goal is to make this as approachable as possible, so we're avoiding unnecessary

Be sure to check the README for each function in the functions folder.

## Localdev Setup

1. `npm install -g netlify-cli`
1. `netlify login`
1. `netlify link` or `netlify init`
1. `netlify dev` will start things locally, and will launch your project at `http://localhost:8888` or comparable.

That will stay running in your terminal. Open up a new tab to your project's directory, and you can run `netlify functions:list` to see your serverless functions. You can then load them up like `http://localhost:8888/.netlify/functions/get_cart` to test.



[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
