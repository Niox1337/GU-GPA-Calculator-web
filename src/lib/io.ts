// Import and export of grade data. Exports a portable JSON snapshot of all three
// datasets. Imports forgivingly, unknown grades are dropped to "not taken" and
// blank rows are skipped, so hand-edited or partial files still load cleanly.
import type { Course } from './gpa'
import { GRADES } from './gpa'

export interface DataBundle {
  year: Course[]
  junior: Course[]
  senior: Course[]
}

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

const strip = (c: Course) => ({ name: c.name, credit: c.credit, grade: c.grade })

/** Serialise the full dataset to a pretty-printed, versioned JSON string. */
export function buildExport(bundle: DataBundle): string {
  return JSON.stringify(
    {
      app: APP_TAG,
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        year: bundle.year.map(strip),
        junior: bundle.junior.map(strip),
        senior: bundle.senior.map(strip),
      },
    },
    null,
    2,
  )
}

/**
 * Parse an exported (or hand-made) file. Accepts the full `{ data: {...} }`
 * bundle, a bare `{ year, junior, senior }` object, or a plain array of courses
 * (treated as the single-year list). Throws a user-friendly error otherwise.
 */
export function parseImport(text: string): DataBundle {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  if (Array.isArray(parsed)) {
    const year = coerceList(parsed)
    if (!year.length) throw new Error('No courses found in that file.')
    return { year, junior: [], senior: [] }
  }

  const root = (parsed ?? {}) as Record<string, unknown>
  const data = (root.data ?? root) as Record<string, unknown>
  const bundle: DataBundle = {
    year: coerceList(data.year),
    junior: coerceList(data.junior),
    senior: coerceList(data.senior),
  }

  if (bundle.year.length + bundle.junior.length + bundle.senior.length === 0) {
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
