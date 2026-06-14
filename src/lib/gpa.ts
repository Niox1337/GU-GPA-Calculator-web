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

const FIRST = 'First Class Honours'
const UPPER = 'Upper Second Class Honours (2:1)'
const LOWER = 'Lower Second Class Honours (2:2)'
const THIRD = 'Third Class Honours'
const FAIL = 'Below Honours Standard'

export interface ClassResult {
  classification: string
  /** True when the GPA fell in a rule 16.37(d) borderline range and the profile decided it. */
  borderline: boolean
  /** Plain-language reason, only set for borderline cases. */
  reason?: string
}

export interface HonoursResult extends ClassResult {
  juniorGpa: number
  seniorGpa: number
  finalGpa: number
}

/** One weighted entry in a degree grade profile (credit- and year-weighted). */
export interface ProfileEntry {
  band: string
  weight: number
}

/** Credit-weighted grade profile for a single year (weights sum to 1). */
export function yearProfile(courses: Course[]): ProfileEntry[] {
  const counted = courses.filter(isCounted)
  const total = counted.reduce((s, c) => s + Number(c.credit), 0)
  if (!total) return []
  return counted.map((c) => ({ band: gradeBand(c.grade), weight: Number(c.credit) / total }))
}

/** Combined honours profile: each year weighted by credit, then by year (40% / 60%). */
export function honoursProfile(junior: Course[], senior: Course[]): ProfileEntry[] {
  return [
    ...yearProfile(junior).map((p) => ({ ...p, weight: p.weight * 0.4 })),
    ...yearProfile(senior).map((p) => ({ ...p, weight: p.weight * 0.6 })),
  ]
}

/** Share of the weighted profile at the given grade bands from 0 to 1. */
function bandShare(profile: ProfileEntry[], bands: string[]): number {
  const total = profile.reduce((s, p) => s + p.weight, 0)
  if (!total) return 0
  const inBands = profile
    .filter((p) => bands.includes(p.band))
    .reduce((s, p) => s + p.weight, 0)
  return inBands / total
}

const pct = (f: number) => `${Math.round(f * 100)}%`

/**
 * Classify a final honours GPA. Clear ranges use the direct method. The four
 * borderline ranges 17.1 to 17.4, 14.1 to 14.4, 11.1 to 11.4, and 8.1 to 8.4 are resolved by
 * the weighted course grade profile, per University of Glasgow regulation
 * 16.37(d). Working in tenths avoids floating-point edge cases.
 */
export function classifyHonours(gpa: number, profile: ProfileEntry[]): ClassResult {
  const g = Math.round(gpa * 10)

  const border = (
    share: number,
    bandsLabel: string,
    high: string,
    low: string,
  ): ClassResult => {
    const met = share >= 0.5
    return {
      classification: met ? high : low,
      borderline: true,
      reason: `${met ? 'at least ' : 'less than '}50% of the weighted grade profile is ${bandsLabel} (${pct(share)})`,
    }
  }

  if (g >= 175) return { classification: FIRST, borderline: false }
  if (g >= 171) return border(bandShare(profile, ['A']), 'at grade A', FIRST, UPPER)
  if (g >= 145) return { classification: UPPER, borderline: false }
  if (g >= 141) return border(bandShare(profile, ['A', 'B']), 'at grade B or above', UPPER, LOWER)
  if (g >= 115) return { classification: LOWER, borderline: false }
  if (g >= 111) return border(bandShare(profile, ['A', 'B', 'C']), 'at grade C or above', LOWER, THIRD)
  if (g >= 85) return { classification: THIRD, borderline: false }
  if (g >= 81) return border(bandShare(profile, ['A', 'B', 'C', 'D']), 'at grade D or above', THIRD, FAIL)
  return { classification: FAIL, borderline: false }
}

/** Direct-only classification with no borderline resolution, used for rough indicators. */
export function honoursClass(gpa: number): string {
  return classifyHonours(gpa, []).classification
}

/** Combines Junior Honours at 40% and Senior Honours at 60%, with borderline resolution. */
export function computeHonours(junior: Course[], senior: Course[]): HonoursResult {
  const juniorGpa = computeYear(junior).gpa
  const seniorGpa = computeYear(senior).gpa
  const finalGpa = Math.round((juniorGpa * 0.4 + seniorGpa * 0.6) * 10) / 10
  return {
    juniorGpa: Math.round(juniorGpa * 10) / 10,
    seniorGpa: Math.round(seniorGpa * 10) / 10,
    finalGpa,
    ...classifyHonours(finalGpa, honoursProfile(junior, senior)),
  }
}

const DISTINCTION = 'Distinction'
const MERIT = 'Merit'
const PASS = 'Pass'

// gradePoint('B1') = 17 and gradePoint('C1') = 14 are the dissertation thresholds.
const B1_POINTS = 17
const C1_POINTS = 14
const PROJECT_RE = /dissertation|project|thesis|independent|placement|research/i

/**
 * Classify a taught postgraduate programme as Distinction, Merit, or Pass,
 * per University of Glasgow generic PGT regulations 9.3 to 9.6.
 *
 * Needs three things from the course list: the overall GPA (all 180 credits),
 * the taught-only GPA, and the grade of the "substantial independent work"
 * dissertation or project. The dissertation is taken to be the largest-credit
 * course with ties broken towards project or dissertation-named courses. Borderline
 * overall GPAs from 17.1 to 17.4 and 14.1 to 14.4 are resolved by the weighted grade
 * profile across all credits.
 */
export function classifyPGT(courses: Course[]): ClassResult {
  const counted = courses.filter(isCounted)
  if (counted.length === 0) return { classification: PASS, borderline: false }

  // Identify the dissertation by largest credit, preferring project-named courses.
  const dissertation = [...counted].sort((a, b) => {
    const byCredit = Number(b.credit) - Number(a.credit)
    if (byCredit !== 0) return byCredit
    return (PROJECT_RE.test(b.name) ? 1 : 0) - (PROJECT_RE.test(a.name) ? 1 : 0)
  })[0]

  const taughtCourses = counted.filter((c) => c.id !== dissertation.id)
  const overall = computeYear(counted).gpa1dp
  const taught = taughtCourses.length ? computeYear(taughtCourses).gpa1dp : overall
  const dissPoints = gradePoint(dissertation.grade)
  const profile = yearProfile(counted)

  const g = Math.round(overall * 10)
  const t = Math.round(taught * 10)
  const aShare = bandShare(profile, ['A'])
  const bShare = bandShare(profile, ['A', 'B'])

  // Distinction rule 9.5 requires overall at least 17.5, taught at least 17.0, and independent work at least B1.
  const distinctionBase = t >= 170 && dissPoints >= B1_POINTS
  if (g >= 175 && distinctionBase) return { classification: DISTINCTION, borderline: false }
  if (g >= 171 && g <= 174 && distinctionBase) {
    if (aShare >= 0.5) {
      return {
        classification: DISTINCTION,
        borderline: true,
        reason: `GPA ${overall.toFixed(1)} is borderline. At least 50% of the weighted profile is grade A (${pct(aShare)}), so Distinction under rule 9.6`,
      }
    }
    return {
      classification: MERIT,
      borderline: true,
      reason: `GPA ${overall.toFixed(1)} is in the Distinction borderline but less than 50% is grade A (${pct(aShare)}), so Merit`,
    }
  }

  // Merit rule 9.3 requires overall at least 14.5, taught at least 14.0, and independent work at least C1.
  const meritBase = t >= 140 && dissPoints >= C1_POINTS
  if (g >= 145 && meritBase) return { classification: MERIT, borderline: false }
  if (g >= 141 && g <= 144 && meritBase) {
    if (bShare >= 0.5) {
      return {
        classification: MERIT,
        borderline: true,
        reason: `GPA ${overall.toFixed(1)} is borderline. At least 50% of the weighted profile is grade B or above (${pct(bShare)}), so Merit under rule 9.4`,
      }
    }
    return {
      classification: PASS,
      borderline: true,
      reason: `GPA ${overall.toFixed(1)} is in the Merit borderline but less than 50% is grade B or above (${pct(bShare)}), so Pass`,
    }
  }

  return { classification: PASS, borderline: false }
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
