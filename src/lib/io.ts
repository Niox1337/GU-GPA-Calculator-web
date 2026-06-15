// Import and export of grade data. Exports a portable JSON snapshot of every
// dataset (single year, plus the Honours and Integrated Masters years and their
// weights). Imports forgivingly: unknown grades drop to "not taken", blank rows
// are skipped, and older files using junior/senior still load.
import type { Course } from './gpa'
import { GRADES } from './gpa'

export interface DataBundle {
  year: Course[]
  honoursYears: Course[][]
  honoursWeights: number[]
  imYears: Course[][]
  imWeights: number[]
}

export const DEFAULT_HONOURS_WEIGHTS = [40, 60]
export const DEFAULT_IM_WEIGHTS = [20, 30, 50]

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

const strip = (c: Course) => ({ name: c.name, credit: c.credit, grade: c.grade })

/** Serialise the full dataset to a pretty-printed, versioned JSON string. */
export function buildExport(bundle: DataBundle): string {
  return JSON.stringify(
    {
      app: APP_TAG,
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        year: bundle.year.map(strip),
        honoursYears: bundle.honoursYears.map((y) => y.map(strip)),
        honoursWeights: bundle.honoursWeights,
        imYears: bundle.imYears.map((y) => y.map(strip)),
        imWeights: bundle.imWeights,
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
    b.imYears.reduce((n, y) => n + y.length, 0)
  )
}

const emptyBundle = (): DataBundle => ({
  year: [],
  honoursYears: [[], []],
  honoursWeights: [...DEFAULT_HONOURS_WEIGHTS],
  imYears: [[], [], []],
  imWeights: [...DEFAULT_IM_WEIGHTS],
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
    bundle.imYears = coerceMatrix(data.imYears, 3)
    bundle.imWeights = coerceWeights(data.imWeights, DEFAULT_IM_WEIGHTS)
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
