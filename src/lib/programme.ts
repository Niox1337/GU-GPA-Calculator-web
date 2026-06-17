// General programme builder model. A programme is an ordered list of years. Each
// year holds one shared course list, where every course is tagged with the term
// it runs in: Semester 1, Semester 2, or both. A "both" course is a single
// record shown in both semesters, so it is edited and removed once and its
// credits count once. Years 1 and 2 form the pre-honours phase and share a
// combined 240 credit target; every later year targets 120. Each year carries a
// weight feeding the existing degree classification, defaulting to the standard
// honours split (Year 3 at 40, Year 4 at 60, earlier years at 0).
import type { Course } from './course'
import { sumCredits } from './course'
import { newId } from './ids'

/** Which semester(s) a course runs in. */
export type Term = 's1' | 's2' | 'both'

export interface YearCourse extends Course {
  term: Term
}

export interface ProgrammeYear {
  id: string
  name: string
  courses: YearCourse[]
  /** Weight used when combining years into the projected classification. */
  weight: number
}

/** Number of leading years that share the combined pre-honours credit target. */
export const PRE_HONOURS_YEARS = 2
export const PRE_HONOURS_TARGET = 240
export const HONOURS_YEAR_TARGET = 120
/** Default per-year weights: only the two honours years count, at 40 and 60. */
export const DEFAULT_YEAR_WEIGHTS = [0, 0, 40, 60]

/** A single programme year with no courses. */
export function makeYear(name: string, weight = 0): ProgrammeYear {
  return { id: newId(), name, courses: [], weight }
}

/** A fresh four-year programme with the standard honours weighting. */
export function makeDefaultProgramme(): ProgrammeYear[] {
  return [1, 2, 3, 4].map((n) => makeYear(`Year ${n}`, DEFAULT_YEAR_WEIGHTS[n - 1] ?? 0))
}

// Each entry is [name, credit, term].
const CS_COURSES: [string, number, Term][][] = [
  [
    ['Computing Science - 1CT Introduction to Computational Thinking', 20, 's1'],
    ['Computing Science - 1S Systems', 10, 's2'],
    ['Computing Science 1F - Computing Fundamentals', 10, 's1'],
    ['Computing Science 1P (Standard Route)', 20, 'both'],
    ['Computing Science 1PX (Alternate Route)', 10, 's2'],
  ],
  [
    ['Algorithmic Foundations 2', 10, 's1'],
    ['Web Application Development 2', 10, 's2'],
    ['Algorithms & Data Structures 2', 10, 's2'],
    ['Introduction to Object Oriented Programming', 10, 's1'],
    ['Networks and Operating Systems Essentials 2', 10, 's1'],
    ['Object-Oriented Software Engineering 2', 10, 's2'],
    ['Computing Science 1F - Computing Fundamentals', 10, 's1'],
  ],
  [
    ['Algorithmics I (H)', 10, 's1'],
    ['Data Fundamentals (H)', 10, 's1'],
    ['Human-centred Systems Design and Evaluation (H)', 10, 's1'],
    ['Systems Programming (H)', 10, 's1'],
    ['Team Project (H)', 30, 'both'],
    ['Professional Software Development (H)', 10, 'both'],
  ],
  [
    ['Individual Project (H) (Single)', 40, 'both'],
    ['Professional Skills and Issues (H)', 10, 's1'],
  ],
]

/** The Computing Science programme with each year pre-loaded with its courses. */
export function makeComputingScienceProgramme(): ProgrammeYear[] {
  return CS_COURSES.map((courses, i) => ({
    ...makeYear(`Year ${i + 1}`, DEFAULT_YEAR_WEIGHTS[i] ?? 0),
    courses: courses.map(([name, credit, term]) => ({
      id: newId(),
      name,
      credit: String(credit),
      grade: '',
      term,
    })),
  }))
}

/** Whether a course runs in the given semester (a "both" course runs in either). */
export function runsIn(course: YearCourse, semester: 's1' | 's2'): boolean {
  return course.term === semester || course.term === 'both'
}

/** Courses shown in one semester section of a year. */
export function coursesInTerm(year: ProgrammeYear, semester: 's1' | 's2'): YearCourse[] {
  return year.courses.filter((c) => runsIn(c, semester))
}

/** Total planned credits in a year, counting every course once. */
export function yearCreditTotal(year: ProgrammeYear): number {
  return sumCredits(year.courses)
}

/** Combined planned credits across the leading pre-honours years. */
export function preHonoursCredits(years: ProgrammeYear[]): number {
  return years.slice(0, PRE_HONOURS_YEARS).reduce((s, y) => s + yearCreditTotal(y), 0)
}

export interface CreditStatus {
  planned: number
  target: number
  status: 'under' | 'on-target' | 'over'
  /** Planned minus target: negative when under, positive when over. */
  diff: number
}

/** How a planned credit total sits against a target. */
export function creditStatus(planned: number, target: number): CreditStatus {
  const diff = planned - target
  const status = diff < 0 ? 'under' : diff > 0 ? 'over' : 'on-target'
  return { planned, target, status, diff }
}
