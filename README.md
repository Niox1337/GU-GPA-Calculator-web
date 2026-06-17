# Glasgow GPA Calculator

A web version of the University of Glasgow GPA calculator. It uses the Schedule A
22-point scale and can calculate a single-year GPA, Honours classification,
Joint Honours classification, or Integrated Masters classification.

This is a React and Vite port of the original
[GU-GPA-Calculator](https://github.com/Niox1337/GU-GPA-Calculator) desktop app.

Deployed at https://zhixiangfeng.com/tools/gu-gpa-calculator/

## Features

- Add courses with names, credits, and Schedule A grades
- Calculate a credit-weighted GPA on the 22-point scale
- Combine degree years with editable weights for Honours and Integrated Masters
- Combine two Joint Honours subjects with editable subject and year weights
- Build a whole programme year by year, with courses searched from the
  University course catalogue and tagged by semester
- Use the Computing Science preset with its compulsory courses, year filters,
  graduation rules, and specialism strand tracking
- Expand the calculation to see each course's points, weight, and contribution
- See a simple credit distribution by grade band
- Save courses, theme, and calculator mode in `localStorage`
- Import and export all course lists and degree weights as a portable JSON file
- Switch between light and dark mode

## How it works

GPA is calculated as a credit-weighted average. Courses without a selected grade
are ignored, so they do not affect the total credits or the GPA.

The app rounds the GPA to one decimal place and maps the rounded point value back
to the nearest Schedule A grade. The calculation follows the original Rust
backend. One checked case from that app is 360 credits giving `C1 13.7`.

Degree classification mode supports the standard two-year Honours shape, a
two-subject Joint Honours shape, and a three-year Integrated Masters shape. The
default weights are 40 and 60 for Honours, 50 and 50 for Joint Honours subjects,
and 24, 36, and 40 for Integrated Masters. If you change the weights, the final
GPA is normalised to the total you enter.

The programme builder lays out each year as Semester 1 and Semester 2 sections.
Courses come from the University course catalogue in `src/data/courses.json`,
each carrying the semester it runs in, so a searched course drops into the right
section. The catalogue is scraped by the scripts in `scripts/`. The Computing
Science preset pre-loads the compulsory courses and tracks the specialism strand
requirements.

Import is forgiving. Blank rows are skipped, unknown grades are reset to "not
taken", and older files that used Junior and Senior Honours lists still load.
Exports include single-year courses, Honours years, Joint Honours subjects, and
Integrated Masters years.

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
