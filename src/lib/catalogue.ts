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

export interface LevelGroup {
  level: number
  courses: CatalogueCourse[]
}

export interface SchoolGroup {
  school: string
  total: number
  levels: LevelGroup[]
}

/** Courses grouped by school, then by level with both sorted for the search tree. */
export const CATALOGUE_TREE: SchoolGroup[] = SCHOOLS.map((school) => {
  const courses = COURSE_CATALOGUE.filter((c) => c.school === school)
  const byLevel = new Map<number, CatalogueCourse[]>()
  for (const c of courses) {
    const list = byLevel.get(c.level) ?? []
    list.push(c)
    byLevel.set(c.level, list)
  }
  const levels: LevelGroup[] = [...byLevel.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([level, list]) => ({
      level,
      courses: list.sort((a, b) => a.name.localeCompare(b.name)),
    }))
  return { school, total: courses.length, levels }
})
