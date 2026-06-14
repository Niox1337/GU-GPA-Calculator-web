# Glasgow GPA Calculator

A web version of the University of Glasgow GPA calculator. It uses the Schedule A
22-point scale and can calculate either a single-year GPA or an honours degree
classification.

This is a React and Vite port of the original
[GU-GPA-Calculator](../GU-GPA-Calculator) desktop app.

## Features

- Add courses with names, credits, and Schedule A grades
- Calculate a credit-weighted GPA on the 22-point scale
- Combine Junior Honours at 40% and Senior Honours at 60%
- Expand the calculation to see each course's points, weight, and contribution
- See a simple credit distribution by grade band
- Save courses, theme, and calculator mode in `localStorage`
- Import and export all courses as a portable JSON file (forgiving import skips
  blank rows and resets unknown grades to "not taken")
- Switch between light and dark mode

## How it works

GPA is calculated as a credit-weighted average. Courses without a selected grade
are ignored, so they do not affect the total credits or the GPA.

The app rounds the GPA to one decimal place and maps the rounded point value back
to the nearest Schedule A grade. The calculation follows the original Rust
backend. One checked case from that app is 360 credits giving `C1 13.7`.

## Getting started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build the production version:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run ESLint:

```bash
npm run lint
```

## Tech stack

- React 19
- TypeScript
- Vite
- Hand-written CSS with theme tokens
- Inline SVG icons

## Contribute to this project

Contributions are welcome, especially fixes to the GPA rules, accessibility, and
small UI details that make the calculator easier to use.

Before opening a pull request:

1. Create a branch for your change.
2. Keep the change focused. A calculator rule fix and a visual redesign should
   be separate pull requests.
3. Run `npm run lint`.
4. Run `npm run build`.
5. Explain what changed and, for calculation changes, include an example input
   and expected result.

If you update the grading logic, check it against the University of Glasgow
Schedule A scale and mention the source in the pull request.
