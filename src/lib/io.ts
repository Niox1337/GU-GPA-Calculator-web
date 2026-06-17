// Import and export of grade data. Exports a portable JSON snapshot of every
// dataset (single year, the Honours, Joint, and Integrated Masters years with
// their weights, and the programme builder years and semesters). Imports forgivingly:
// unknown grades drop to "not taken", blank rows are skipped, older files using
// junior/senior still load, and files predating a dataset fall back to defaults.
import type { Course } from './course'
import type { JointSubject } from './classification'
import type { ProgrammeYear, Term, YearCourse } from './programme'
import { DEFAULT_YEAR_WEIGHTS, makeDefaultProgramme } from './programme'
import { GRADES } from './grades'

export interface DataBundle {
  year: Course[]
  honoursYears: Course[][]
  honoursWeights: number[]
  jointSubjects: JointSubject[]
  jointSubjectWeights: number[]
  imYears: Course[][]
  imWeights: number[]
  programme: ProgrammeYear[]
}

export const DEFAULT_HONOURS_WEIGHTS = [40, 60]
export const DEFAULT_IM_WEIGHTS = [24, 36, 40]
export const DEFAULT_SUBJECT_WEIGHTS = [50, 50]

export const makeDefaultJointSubjects = (): JointSubject[] => [
  { name: 'Subject X', years: [[], []], yearWeights: [...DEFAULT_HONOURS_WEIGHTS] },
  { name: 'Subject Y', years: [[], []], yearWeights: [...DEFAULT_HONOURS_WEIGHTS] },
]

const APP_TAG = 'glasgow-gpa-calculator'
const VALID_GRADES = new Set(GRADES)

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

function coerceCourse(raw: unknown): Course | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const name = typeof r.name === 'string' ? r.name.trim() : ''
  const credit =
    typeof r.credit === 'number'
      ? String(r.credit)
      : typeof r.credit === 'string'
        ? r.credit.trim()
        : ''
  if (!name && !credit) return null

  let grade = typeof r.grade === 'string' ? r.grade.trim().toUpperCase() : ''
  if (grade && !VALID_GRADES.has(grade)) grade = ''

  return { id: newId(), name, credit, grade }
}

function coerceList(raw: unknown): Course[] {
  if (!Array.isArray(raw)) return []
  return raw.map(coerceCourse).filter((c): c is Course => c !== null)
}

function coerceMatrix(raw: unknown, years: number): Course[][] {
  const arr = Array.isArray(raw) ? raw : []
  return Array.from({ length: years }, (_, i) => coerceList(arr[i]))
}

function coerceWeights(raw: unknown, fallback: number[]): number[] {
  const arr = Array.isArray(raw) ? raw : []
  return fallback.map((d, i) => {
    const v = Number(arr[i])
    return Number.isFinite(v) && v >= 0 ? v : d
  })
}

function coerceSubject(raw: unknown, fallbackName: string): JointSubject {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const name = typeof r.name === 'string' && r.name.trim() ? r.name.trim() : fallbackName
  return {
    name,
    years: coerceMatrix(r.years, 2),
    yearWeights: coerceWeights(r.yearWeights, DEFAULT_HONOURS_WEIGHTS),
  }
}

function coerceSubjects(raw: unknown): JointSubject[] {
  const arr = Array.isArray(raw) ? raw : []
  return [coerceSubject(arr[0], 'Subject X'), coerceSubject(arr[1], 'Subject Y')]
}

function coerceNumber(raw: unknown, fallback: number): number {
  const v = Number(raw)
  return Number.isFinite(v) && v >= 0 ? v : fallback
}

const VALID_TERMS = new Set<string>(['s1', 's2', 'both'])

function coerceYearCourse(raw: unknown, term: Term): YearCourse | null {
  const base = coerceCourse(raw)
  if (!base) return null
  const t =
    raw && typeof raw === 'object' && VALID_TERMS.has(String((raw as Record<string, unknown>).term))
      ? ((raw as Record<string, unknown>).term as Term)
      : term
  return { ...base, term: t }
}

function coerceYearCourses(raw: unknown, term: Term): YearCourse[] {
  if (!Array.isArray(raw)) return []
  return raw.map((c) => coerceYearCourse(c, term)).filter((c): c is YearCourse => c !== null)
}

function coerceYear(raw: unknown, i: number): ProgrammeYear {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const name = typeof r.name === 'string' && r.name.trim() ? r.name.trim() : `Year ${i + 1}`
  // Current files keep one tagged course list. Older files that split courses
  // into a semesters array load Semester 1 and Semester 2 with the matching tag.
  let courses: YearCourse[]
  if (Array.isArray(r.courses)) {
    courses = coerceYearCourses(r.courses, 's1')
  } else if (Array.isArray(r.semesters)) {
    courses = [
      ...coerceYearCourses(r.semesters[0], 's1'),
      ...coerceYearCourses(r.semesters[1], 's2'),
    ]
  } else {
    courses = []
  }
  return {
    id: newId(),
    name,
    courses,
    weight: coerceNumber(r.weight, DEFAULT_YEAR_WEIGHTS[i] ?? 0),
  }
}

function coerceProgramme(raw: unknown): ProgrammeYear[] {
  if (!Array.isArray(raw) || raw.length === 0) return makeDefaultProgramme()
  return raw.map((year, i) => coerceYear(year, i))
}

const strip = (c: Course) => ({ name: c.name, credit: c.credit, grade: c.grade })

/** Serialise the full dataset to a pretty-printed, versioned JSON string. */
export function buildExport(bundle: DataBundle): string {
  return JSON.stringify(
    {
      app: APP_TAG,
      version: 3,
      exportedAt: new Date().toISOString(),
      data: {
        year: bundle.year.map(strip),
        honoursYears: bundle.honoursYears.map((y) => y.map(strip)),
        honoursWeights: bundle.honoursWeights,
        jointSubjects: bundle.jointSubjects.map((s) => ({
          name: s.name,
          years: s.years.map((y) => y.map(strip)),
          yearWeights: s.yearWeights,
        })),
        jointSubjectWeights: bundle.jointSubjectWeights,
        imYears: bundle.imYears.map((y) => y.map(strip)),
        imWeights: bundle.imWeights,
        programme: bundle.programme.map((y) => ({
          name: y.name,
          weight: y.weight,
          courses: y.courses.map((c) => ({ ...strip(c), term: c.term })),
        })),
      },
    },
    null,
    2,
  )
}

/** Total number of courses across every dataset in a bundle. */
export function bundleCount(b: DataBundle): number {
  return (
    b.year.length +
    b.honoursYears.reduce((n, y) => n + y.length, 0) +
    b.jointSubjects.reduce((n, s) => n + s.years.reduce((m, y) => m + y.length, 0), 0) +
    b.imYears.reduce((n, y) => n + y.length, 0) +
    b.programme.reduce((n, y) => n + y.courses.length, 0)
  )
}

const emptyBundle = (): DataBundle => ({
  year: [],
  honoursYears: [[], []],
  honoursWeights: [...DEFAULT_HONOURS_WEIGHTS],
  jointSubjects: makeDefaultJointSubjects(),
  jointSubjectWeights: [...DEFAULT_SUBJECT_WEIGHTS],
  imYears: [[], [], []],
  imWeights: [...DEFAULT_IM_WEIGHTS],
  programme: makeDefaultProgramme(),
})

/**
 * Parse an exported (or hand-made) file. Accepts the current bundle, a bare
 * array of courses (treated as the single year), or an older file that used
 * `junior`/`senior` (mapped onto the Honours years).
 */
export function parseImport(text: string): DataBundle {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  const bundle = emptyBundle()

  if (Array.isArray(parsed)) {
    bundle.year = coerceList(parsed)
  } else {
    const root = (parsed ?? {}) as Record<string, unknown>
    const data = (root.data ?? root) as Record<string, unknown>

    bundle.year = coerceList(data.year)
    if (data.honoursYears !== undefined || data.junior !== undefined) {
      bundle.honoursYears =
        data.honoursYears !== undefined
          ? coerceMatrix(data.honoursYears, 2)
          : [coerceList(data.junior), coerceList(data.senior)]
    }
    bundle.honoursWeights = coerceWeights(data.honoursWeights, DEFAULT_HONOURS_WEIGHTS)
    if (data.jointSubjects !== undefined) {
      bundle.jointSubjects = coerceSubjects(data.jointSubjects)
    }
    bundle.jointSubjectWeights = coerceWeights(data.jointSubjectWeights, DEFAULT_SUBJECT_WEIGHTS)
    bundle.imYears = coerceMatrix(data.imYears, 3)
    bundle.imWeights = coerceWeights(data.imWeights, DEFAULT_IM_WEIGHTS)
    if (data.programme !== undefined) {
      bundle.programme = coerceProgramme(data.programme)
    }
  }

  if (bundleCount(bundle) === 0) {
    throw new Error('No courses found in that file.')
  }
  return bundle
}

/** Trigger a browser download of a text file. */
export function downloadFile(filename: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Read a picked File as text. */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsText(file)
  })
}
