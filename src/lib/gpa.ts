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

export interface DegreeResult extends ClassResult {
  yearGpas: number[]
  finalGpa: number
}

/** Combined weighted grade profile across years: each year is credit-weighted, then scaled by its programme weight. */
export function degreeProfile(years: Course[][], weights: number[]): ProfileEntry[] {
  const totalWeight = weights.reduce((s, w) => s + w, 0) || 1
  return years.flatMap((courses, i) =>
    yearProfile(courses).map((p) => ({
      ...p,
      weight: (p.weight * (weights[i] ?? 0)) / totalWeight,
    })),
  )
}

/** Unrounded weighted average of several year GPAs (weights normalised to their total). */
function weightedYearGpa(years: Course[][], weights: number[]): number {
  const totalWeight = weights.reduce((s, w) => s + w, 0) || 1
  return years.reduce((s, y, i) => s + computeYear(y).gpa * (weights[i] ?? 0), 0) / totalWeight
}

/**
 * Generic multi-year degree classification (Honours, Integrated Masters, …).
 * The final GPA is the year GPAs combined by the given weights (normalised to
 * their total), then classified with §16.37(d) borderline resolution.
 */
export function computeDegree(years: Course[][], weights: number[]): DegreeResult {
  const finalGpa = Math.round(weightedYearGpa(years, weights) * 10) / 10
  return {
    yearGpas: years.map((y) => Math.round(computeYear(y).gpa * 10) / 10),
    finalGpa,
    ...classifyHonours(finalGpa, degreeProfile(years, weights)),
  }
}

export interface JointSubject {
  name: string
  years: Course[][]
  yearWeights: number[]
}

export interface JointResult extends ClassResult {
  subjectGpas: number[]
  finalGpa: number
}

/** Combined grade profile across joint-honours subjects: year-weighted within each subject, then subject-weighted. */
export function jointProfile(subjects: JointSubject[], subjectWeights: number[]): ProfileEntry[] {
  const totalWeight = subjectWeights.reduce((s, w) => s + w, 0) || 1
  return subjects.flatMap((subject, i) =>
    degreeProfile(subject.years, subject.yearWeights).map((p) => ({
      ...p,
      weight: (p.weight * (subjectWeights[i] ?? 0)) / totalWeight,
    })),
  )
}

/**
 * Joint Honours: each subject is aggregated over its own years (with its own
 * year weights), then the subject GPAs are aggregated, usually 50:50. The final
 * joint GPA is classified with §16.37(d) borderline resolution.
 */
export function computeJoint(subjects: JointSubject[], subjectWeights: number[]): JointResult {
  const totalWeight = subjectWeights.reduce((s, w) => s + w, 0) || 1
  const subjectGpasRaw = subjects.map((s) => weightedYearGpa(s.years, s.yearWeights))
  const finalRaw = subjectGpasRaw.reduce((s, g, i) => s + g * (subjectWeights[i] ?? 0), 0) / totalWeight
  const finalGpa = Math.round(finalRaw * 10) / 10
  return {
    subjectGpas: subjectGpasRaw.map((g) => Math.round(g * 10) / 10),
    finalGpa,
    ...classifyHonours(finalGpa, jointProfile(subjects, subjectWeights)),
  }
}

// ============================================================================
// Progression checks (College of Science & Engineering minimum requirements)
// https://www.gla.ac.uk/colleges/scienceengineering/students/scienceprogresscommitteecose-spc/
// ============================================================================

// Science progression thresholds on the Schedule A scale.
// D3 = 9 is the minimum pass; the Computing Science Honours entry rule uses C3 = 12.
const D3_POINTS = gradePoint('D3')
const C3_POINTS = gradePoint('C3')

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Credit-weighted GPA over the best `n` credits. Counted courses are ranked by
 * grade point, highest first, then accumulated until `n` credits are reached.
 * The course that straddles the boundary contributes only the fraction of its
 * credits needed to reach `n`, so the result reflects exactly the best `n`
 * credits. `credits` reports how many were actually available (may be below `n`).
 */
export function bestCreditsGpa(courses: Course[], n: number): { gpa: number; credits: number } {
  const ranked = courses
    .filter(isCounted)
    .sort((a, b) => gradePoint(b.grade) - gradePoint(a.grade))

  let remaining = n
  let weighted = 0
  let used = 0
  for (const c of ranked) {
    if (remaining <= 0) break
    const credit = Math.min(Number(c.credit), remaining)
    weighted += gradePoint(c.grade) * credit
    used += credit
    remaining -= credit
  }
  return { gpa: used ? weighted / used : 0, credits: used }
}

/** Total credits whose grade sits at or above the given point value (counted courses only). */
export function creditsAtOrAbove(courses: Course[], minPoint: number): number {
  return courses
    .filter(isCounted)
    .filter((c) => gradePoint(c.grade) >= minPoint)
    .reduce((s, c) => s + Number(c.credit), 0)
}

export type ProgressionTarget = 'l1' | 'l2' | 'bsc' | 'msci' | 'cs-honours' | 'l3' | 'l4'

// School of Computing Science Level 3 entry programmes. Each sets the GPA
// threshold, the credit base it is measured over, and whether resits count.
// Source: SoCS "Introduction to Computing Science Honours" entry requirements.
export type CsDegree = 'csh' | 'eseh' | 'combined' | 'designated'

interface CsEntrySpec {
  threshold: number
  credits: number
  firstAttempt: boolean
}

const CS_SPECS: Record<CsDegree, CsEntrySpec> = {
  // CSH/M, SEH/M, SEYPM: 12.0 over all 6 Level 2 computing courses (60 credits).
  csh: { threshold: C3_POINTS, credits: 60, firstAttempt: true },
  // ESEH: 12.0 over the 5 prerequisite Level 2 computing courses (50 credits).
  eseh: { threshold: C3_POINTS, credits: 50, firstAttempt: true },
  // CSH/M+ (combined): 12.0 over 40 credits including ADS2, IOOP2 and OOSE2.
  combined: { threshold: C3_POINTS, credits: 40, firstAttempt: true },
  // CS, CS+ (designated): 9.0 over Level 2 computing courses, resits allowed.
  designated: { threshold: D3_POINTS, credits: 60, firstAttempt: false },
}

export interface Requirement {
  label: string
  met: boolean
  detail: string
}

export interface ProgressionResult {
  /** True only when every requirement is satisfied. */
  met: boolean
  /** False until at least one course has a grade, so the UI can stay neutral. */
  ready: boolean
  requirements: Requirement[]
}

/** A "GPA of at least X over the best N credits" requirement. */
function gpaRequirement(courses: Course[], n: number, threshold: number): Requirement {
  const best = bestCreditsGpa(courses, n)
  const gpa = round1(best.gpa)
  return {
    label: `GPA of at least ${threshold.toFixed(1)} across the best ${n} credits`,
    met: best.credits >= n && gpa >= threshold,
    detail:
      best.credits >= n
        ? `GPA ${gpa.toFixed(1)} over the best ${n} credits`
        : `Only ${best.credits} of ${n} credits available`,
  }
}

/** A "have at least N credits" requirement. */
function creditRequirement(totalCredit: number, n: number, noun = 'credits'): Requirement {
  return {
    label: `At least ${n} ${noun}`,
    met: totalCredit >= n,
    detail: `${totalCredit} ${noun} entered`,
  }
}

/** A "N credits at D3 or above" requirement. */
function d3Requirement(courses: Course[], n: number): Requirement {
  const d3plus = creditsAtOrAbove(courses, D3_POINTS)
  return {
    label: `${n} credits at D3 or better`,
    met: d3plus >= n,
    detail: `${d3plus} credits at D3 or above`,
  }
}

/**
 * Evaluate a student's courses against the College of Science & Engineering and
 * School of Computing Science Level 3 entry rules for the chosen target,
 * reporting each rule separately so the UI can show a per-rule checklist.
 *
 * - `l1`/`l2` apply the within-level §3.1 rule: 80 credits, GPA of at least 8.0
 *   over the best 80 credits, and 60 credits at D3 or above.
 * - `bsc` applies the §15.1 Honours admission rule: 240 credits at GPA 9.0 and
 *   200 credits at D3 or above.
 * - `msci` applies the MSci admission rule: 240 credits at GPA 12.0 and 200
 *   credits at D3 or above.
 * - `cs-honours` applies the School of Computing Science entry rule for the
 *   given `csDegree`: a GPA over the Level 2 computing courses at first attempt
 *   (12.0 for Honours/MSci programmes, 9.0 for Designated).
 * - `l3`/`l4` apply the within-Honours rule on the level GPA: BSc progression to
 *   Level 4 needs 9.0 in Level 3; MSci progression to Level 4 and Level 5 needs
 *   12.0 in Level 3 and Level 4 respectively.
 */
export function checkProgression(
  target: ProgressionTarget,
  courses: Course[],
  csDegree: CsDegree = 'csh',
): ProgressionResult {
  const counted = courses.filter(isCounted)
  const totalCredit = counted.reduce((s, c) => s + Number(c.credit), 0)
  const ready = counted.length > 0

  let requirements: Requirement[]
  // When set, overrides the default "every requirement met" verdict. Used by the
  // banded level-3 check where meeting only the BSc bar still allows progression.
  let met: boolean | undefined

  switch (target) {
    case 'cs-honours': {
      const spec = CS_SPECS[csDegree]
      const best = bestCreditsGpa(counted, spec.credits)
      const gpa = round1(best.gpa)
      const firstAttempt = spec.firstAttempt ? ' at first attempt' : ''
      requirements = [
        creditRequirement(totalCredit, spec.credits, 'credits of Level 2 computing courses'),
        {
          label: `GPA of at least ${spec.threshold.toFixed(1)} (${pointToGrade(
            spec.threshold,
          )}) over ${spec.credits} credits${firstAttempt}`,
          met: best.credits >= spec.credits && gpa >= spec.threshold,
          detail:
            best.credits >= spec.credits
              ? `GPA ${gpa.toFixed(1)} over the best ${spec.credits} credits`
              : `Only ${best.credits} of ${spec.credits} credits available`,
        },
      ]
      break
    }
    case 'bsc':
      requirements = [
        creditRequirement(totalCredit, 240),
        gpaRequirement(counted, 240, 9),
        d3Requirement(counted, 200),
      ]
      break
    case 'msci':
      requirements = [
        creditRequirement(totalCredit, 240),
        gpaRequirement(counted, 240, 12),
        d3Requirement(counted, 200),
      ]
      break
    case 'l3': {
      const gpa = computeYear(counted).gpa1dp
      requirements = [
        {
          label: 'GPA of at least 9.0 over Level 3 (BSc progression to Level 4)',
          met: gpa >= 9,
          detail: `Level 3 GPA ${gpa.toFixed(1)}`,
        },
        {
          label: 'GPA of at least 12.0 over Level 3 (MSci progression to Level 4)',
          met: gpa >= 12,
          detail: `Level 3 GPA ${gpa.toFixed(1)}`,
        },
      ]
      // BSc progression is the minimum bar; below 9.0 means switching to a designated degree.
      met = gpa >= 9
      break
    }
    case 'l4': {
      const gpa = computeYear(counted).gpa1dp
      requirements = [
        {
          label: 'GPA of at least 12.0 over Level 4 (MSci progression to Level 5)',
          met: gpa >= 12,
          detail: `Level 4 GPA ${gpa.toFixed(1)}`,
        },
      ]
      break
    }
    case 'l1':
    case 'l2':
    default:
      requirements = [
        creditRequirement(totalCredit, 80),
        gpaRequirement(counted, 80, 8),
        d3Requirement(counted, 60),
      ]
  }

  return { met: met ?? requirements.every((r) => r.met), ready, requirements }
}

// The six standard Level 2 Computing Science courses used for Honours entry
// (ADS2, AF2, IOOP2, NOSE2, OOSE2 and WAD2), each 10 credits, 60 in total.
export const CS_L2_COURSES: Omit<Course, 'id'>[] = [
  { name: 'Algorithms & Data Structures 2', credit: '10', grade: '' },
  { name: 'Algorithmic Foundations 2', credit: '10', grade: '' },
  { name: 'Introduction to Object Oriented Programming', credit: '10', grade: '' },
  { name: 'Networks and Operating Systems Essentials 2', credit: '10', grade: '' },
  { name: 'Object-Oriented Software Engineering 2', credit: '10', grade: '' },
  { name: 'Web Application Development 2', credit: '10', grade: '' },
]

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
