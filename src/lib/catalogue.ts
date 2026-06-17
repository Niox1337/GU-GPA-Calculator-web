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
  /** Which semester(s) the course runs in, when known. */
  semester?: 's1' | 's2' | 'both'
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

// Computing Science Year 3 allow-list: the six pre-loaded honours courses plus
// the standard optional courses, by catalogue code.
export const CS_YEAR3_CODES = new Set([
  'COMPSCI4009', 'COMPSCI4073', 'COMPSCI4014', 'COMPSCI4081', 'COMPSCI4047', 'COMPSCI4015',
  'COMPSCI4105', 'COMPSCI4012', 'COMPSCI4011', 'COMPSCI4068', 'COMPSCI5076', 'COMPSCI4100',
  'COMPSCI4077', 'COMPSCI4074', 'COMPSCI4062', 'COMPSCI4016', 'COMPSCI4076', 'COMPSCI5094',
  'COMPSCI5079',
])

/**
 * Catalogue search filter for a Computing Science programme year (1-based):
 * years 1-2 show levels 1-2, year 3 shows only the year-3 allow-list, year 4+
 * shows levels 4-5 within School of Computing Science.
 */
export function csYearFilter(year: number): (c: CatalogueCourse) => boolean {
  if (year <= 2) return (c) => c.level <= 2
  if (year === 3) return (c) => CS_YEAR3_CODES.has(c.code)
  return (c) => c.level >= 4 && c.school === 'School of Computing Science'
}

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
