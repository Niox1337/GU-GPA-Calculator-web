// University of Glasgow Schedule A GPA logic.
// The formulas match the original Tauri/Rust backend in src-tauri/src/main.rs.
//
// Schedule A is a 22-point scale:
//   A1=22 A2=21 A3=20 A4=19 A5=18 | B1=17 B2=16 B3=15 | C1=14 C2=13 C3=12
//   D1=11 D2=10 D3=9 | E1=8 E2=7 E3=6 | F1=5 F2=4 F3=3 | G1=2 G2=1 | H=0
// GPA is the credit-weighted average of grade points.
// Courses without a recorded grade are left out of both the numerator and denominator.

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

export interface YearResult {
  totalCredit: number
  gpa: number
  gpa1dp: number
  letter: string
  steps: Step[]
  countedCount: number
}

// Base value per leading letter. Subtracting the numeric suffix gives the point value.
const LETTER_BASE: Record<string, number> = {
  A: 23,
  B: 18,
  C: 15,
  D: 12,
  E: 9,
  F: 6,
  G: 3,
  H: 0,
}

// Ordered Schedule A grades for selection UIs.
export const GRADES: string[] = [
  'A1', 'A2', 'A3', 'A4', 'A5',
  'B1', 'B2', 'B3',
  'C1', 'C2', 'C3',
  'D1', 'D2', 'D3',
  'E1', 'E2', 'E3',
  'F1', 'F2', 'F3',
  'G1', 'G2',
  'H',
]

/** Converts a Schedule A grade such as "A1" to its point value, such as 22. */
export function gradePoint(grade: string): number {
  const g = grade.trim().toUpperCase()
  const base = LETTER_BASE[g[0]] ?? 0
  if (base === 0) return 0
  const second = parseInt(g[1] ?? '0', 10)
  return base - (Number.isNaN(second) ? 0 : second)
}

/** Converts a rounded point value back to the nearest Schedule A grade. */
export function pointToGrade(point: number): string {
  let letter: string
  if (point >= 18) letter = 'A'
  else if (point >= 15) letter = 'B'
  else if (point >= 12) letter = 'C'
  else if (point >= 9) letter = 'D'
  else if (point >= 6) letter = 'E'
  else if (point >= 3) letter = 'F'
  else if (point >= 1) letter = 'G'
  else return 'H'
  return `${letter}${LETTER_BASE[letter] - point}`
}

/** Returns the primary band used by the distribution chart. */
export function gradeBand(grade: string): string {
  const c = grade.trim().toUpperCase()[0]
  return LETTER_BASE[c] !== undefined ? c : 'H'
}

function isCounted(c: Course): boolean {
  return !!c.grade && c.grade !== 'MV' && Number(c.credit) > 0
}

/** Calculates one year's GPA and keeps the per-course contribution for the breakdown table. */
export function computeYear(courses: Course[]): YearResult {
  const counted = courses.filter(isCounted)
  const totalCredit = counted.reduce((sum, c) => sum + Number(c.credit), 0)

  let gpa = 0
  const steps: Step[] = counted.map((c) => {
    const credit = Number(c.credit)
    const weight = totalCredit ? credit / totalCredit : 0
    const point = gradePoint(c.grade)
    const contribution = point * weight
    gpa += contribution
    return { name: c.name, credit, grade: c.grade, point, weight, contribution }
  })

  return {
    totalCredit,
    gpa,
    gpa1dp: Math.round(gpa * 10) / 10,
    letter: pointToGrade(Math.round(gpa)),
    steps,
    countedCount: counted.length,
  }
}

export interface Distribution {
  band: string
  label: string
  credit: number
  fraction: number
}

const BAND_LABELS: Record<string, string> = {
  A: 'A - Excellent',
  B: 'B - Very good',
  C: 'C - Good',
  D: 'D - Satisfactory',
  E: 'E - Weak',
  F: 'F - Poor',
  G: 'G - Very poor',
  H: 'H - Fail',
}

/** Calculates credit share per grade band for the distribution visual. */
export function creditDistribution(courses: Course[]): Distribution[] {
  const counted = courses.filter(isCounted)
  const total = counted.reduce((s, c) => s + Number(c.credit), 0)
  const byBand = new Map<string, number>()
  for (const c of counted) {
    const band = gradeBand(c.grade)
    byBand.set(band, (byBand.get(band) ?? 0) + Number(c.credit))
  }
  return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    .filter((b) => byBand.has(b))
    .map((band) => {
      const credit = byBand.get(band) ?? 0
      return { band, label: BAND_LABELS[band], credit, fraction: total ? credit / total : 0 }
    })
}

export interface HonoursResult {
  juniorGpa: number
  seniorGpa: number
  finalGpa: number
  classification: string
}

/** Maps a final honours GPA to a degree classification by the direct method. */
export function honoursClass(gpa: number): string {
  if (gpa >= 17.5) return 'First Class Honours'
  if (gpa >= 14.5) return 'Upper Second Class Honours (2:1)'
  if (gpa >= 11.5) return 'Lower Second Class Honours (2:2)'
  if (gpa >= 8.5) return 'Third Class Honours'
  return 'Below Honours Standard'
}

/** Combines Junior Honours at 40% and Senior Honours at 60%. */
export function computeHonours(junior: Course[], senior: Course[]): HonoursResult {
  const juniorGpa = computeYear(junior).gpa
  const seniorGpa = computeYear(senior).gpa
  const finalGpa = Math.round((juniorGpa * 0.4 + seniorGpa * 0.6) * 10) / 10
  return {
    juniorGpa: Math.round(juniorGpa * 10) / 10,
    seniorGpa: Math.round(seniorGpa * 10) / 10,
    finalGpa,
    classification: honoursClass(finalGpa),
  }
}

// Example Senior Honours year for Computing Science.
// Course titles and credit weights follow the UofG catalogue pattern.
export const EXAMPLE_COURSES: Omit<Course, 'id'>[] = [
  { name: 'Individual Project (H)', credit: '40', grade: 'A2' },
  { name: 'Team Project (H)', credit: '20', grade: 'A4' },
  { name: 'Machine Learning (H)', credit: '10', grade: 'B1' },
  { name: 'Artificial Intelligence (H)', credit: '10', grade: 'A5' },
  { name: 'Networked Systems (H)', credit: '10', grade: 'B2' },
  { name: 'Database Systems (H)', credit: '10', grade: 'C1' },
  { name: 'Functional Programming (H)', credit: '10', grade: 'B3' },
  { name: 'Professional Software Development (H)', credit: '10', grade: 'A3' },
]
