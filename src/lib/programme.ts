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
