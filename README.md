# A(n)Writing

A(n)Writing is a self-contained, genre-based proofreading studio for learners who want to
practise the English articles **a**, **an**, and **the**. It revives the original Express and
AngularJS project as a fast, accessible TypeScript single-page app.

## What changed

- Replaced the retired Express/Jade/AngularJS/Bower stack with Vite and strict TypeScript.
- Preserved the original Fiction, Academic, and Business writing choices.
- Added two complete exercise modes:
  - **Guided** shows every article gap as an inline choice.
  - **Editor** removes all articles from an editable draft and grades their exact placements.
- Added contextual hints, reset and reveal controls, progress saved in the browser, keyboard
  support, responsive layouts, and accessible status feedback.
- Replaced fragile BBC, arXiv, and Reddit scraping with an original built-in passage library, so
  every mode works reliably on Netlify without a server, API key, or third-party outage.
- Added unit, browser, accessibility, formatting, linting, and production-build checks.

## Local development

Use Node 24 (the required version is in `.nvmrc`), then run:

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm test
npm run build
npm run test:e2e
npm run check
```

## Deploying to Netlify

The repository includes `netlify.toml`. Create a Netlify site from the repository and accept the
detected settings:

- Build command: `npm run build`
- Publish directory: `dist`
- Node: `24.17.0`

The catch-all redirect supports SPA URLs, while the response headers add a restrictive Content
Security Policy and other production safeguards.

## Licence

Code is available under the [MIT licence](LICENSE.txt). Practice passages are original text written
for A(n)Writing.
