// Course catalogue for the in-app "Search course" picker.
//
// The data lives in src/data/courses.json, keyed by school:
//   { "School Name": [ { name, code, credit, level }, ... ], ... }
// It is imported once at module load and flattened in memory into a single
// COURSE_CATALOGUE array (each course tagged with its school), so lookups are
// synchronous and need no network. Add a school by adding a key in the JSON.
import rawCatalogue from '../data/courses.json'

export interface Specialism {
  strand: string
  requirement: string
}

interface RawCourse {
  name: string
  code: string
  credit: number
  /** SCQF year or level from 1 to 5, used as a grouping or label hint. */
  level: number
  /** Which semester(s) the course runs in, when known. */
  semester?: 's1' | 's2' | 'both'
  /** Honours specialism strands this course counts towards, when any. */
  specialisms?: Specialism[]
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

// Fixed strand order; an index here is the colour slot for that strand's tag.
export const SPECIALISM_STRANDS = [
  'Data Management',
  'Human Computer Interaction',
  'Information Security',
  'Parallel and Distributed Systems',
  'Theoretical Computer Science',
]

/** Lowercased course name to its specialism strands, for tagging added courses by name. */
export const STRANDS_BY_NAME = new Map<string, string[]>(
  COURSE_CATALOGUE.filter((c) => c.specialisms?.length).map((c) => [
    c.name.toLowerCase(),
    c.specialisms!.map((s) => s.strand),
  ]),
)

// ponytail: minimum optional courses per strand, from the CS handbook (not in the
// course data). Update here if the handbook requirements change.
const STRAND_MIN_OPTIONAL: Record<string, number> = {
  'Data Management': 4,
  'Human Computer Interaction': 4,
  'Information Security': 3,
  'Parallel and Distributed Systems': 3,
  'Theoretical Computer Science': 4,
}

interface StrandInfo {
  strand: string
  minOptional: number
  compulsory: string[]
  optional: string[]
}

/** Compulsory and optional course names per strand, with the optional minimum. */
const SPECIALISM_INFO: StrandInfo[] = SPECIALISM_STRANDS.map((strand) => {
  const compulsory: string[] = []
  const optional: string[] = []
  for (const c of COURSE_CATALOGUE) {
    const sp = c.specialisms?.find((s) => s.strand === strand)
    if (!sp) continue
    ;(sp.requirement === 'compulsory' ? compulsory : optional).push(c.name)
  }
  return { strand, minOptional: STRAND_MIN_OPTIONAL[strand] ?? 0, compulsory, optional }
})

export interface StrandProgress {
  strand: string
  pickedOptional: number
  minOptional: number
  compulsory: { name: string; picked: boolean }[]
}

/** Per-strand progress given the lowercased names of the courses already picked. */
export function strandProgress(picked: Set<string>): StrandProgress[] {
  return SPECIALISM_INFO.map((info) => ({
    strand: info.strand,
    minOptional: info.minOptional,
    pickedOptional: info.optional.filter((n) => picked.has(n.toLowerCase())).length,
    compulsory: info.compulsory.map((name) => ({ name, picked: picked.has(name.toLowerCase()) })),
  }))
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
