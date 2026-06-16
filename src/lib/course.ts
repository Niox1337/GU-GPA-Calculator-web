// Core course types shared across the GPA, classification, and progression logic.
// A course only contributes to a GPA once it has a recorded grade and credits.

export interface Course {
  id: string
  name: string
  credit: string // Kept as text so the form can preserve in-progress input.
  grade: string // Empty means "not taken" and is not counted.
}

export interface Step {
  name: string
  credit: number
  grade: string
  point: number
  weight: number
  contribution: number
}

/** A course counts towards a GPA when it has a real grade and positive credits. */
export function isCounted(c: Course): boolean {
  return !!c.grade && c.grade !== 'MV' && Number(c.credit) > 0
}

/** Total credits across the given (already counted) courses. */
export function sumCredits(courses: Course[]): number {
  return courses.reduce((s, c) => s + Number(c.credit), 0)
}
