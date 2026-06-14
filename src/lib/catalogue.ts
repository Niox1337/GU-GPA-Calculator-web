// Course catalogue for the in-app "Search course" picker.
//
// The data lives in src/data/courses.json, keyed by school:
//   { "School Name": [ { name, code, credit, level }, ... ], ... }
// It is imported once at module load and flattened in memory into a single
// COURSE_CATALOGUE array (each course tagged with its school), so lookups are
// synchronous and need no network. Add a school by adding a key in the JSON.
import rawCatalogue from '../data/courses.json'

interface RawCourse {
  name: string
  code: string
  credit: number
  /** SCQF year or level from 1 to 5, used as a grouping or label hint. */
  level: number
}

export interface CatalogueCourse extends RawCourse {
  school: string
}

const catalogue = rawCatalogue as Record<string, RawCourse[]>

/** All school names present in the catalogue. */
export const SCHOOLS: string[] = Object.keys(catalogue)

/** Flat, in-memory list of every course across all schools. */
export const COURSE_CATALOGUE: CatalogueCourse[] = Object.entries(catalogue).flatMap(
  ([school, courses]) => courses.map((course) => ({ ...course, school })),
)
