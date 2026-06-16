// Degree classification logic: Honours, Integrated Masters, Joint Honours, and
// taught postgraduate (PGT). All thresholds follow University of Glasgow
// regulations and work in tenths to avoid floating-point edge cases.
import type { Course } from './course'
import { isCounted } from './course'
import { gradePoint } from './grades'
import type { ProfileEntry } from './gpa'
import { bandShare, computeYear, yearProfile } from './gpa'

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

const pct = (f: number) => `${Math.round(f * 100)}%`

/** Combined honours profile: each year weighted by credit, then by year (40% / 60%). */
export function honoursProfile(junior: Course[], senior: Course[]): ProfileEntry[] {
  return [
    ...yearProfile(junior).map((p) => ({ ...p, weight: p.weight * 0.4 })),
    ...yearProfile(senior).map((p) => ({ ...p, weight: p.weight * 0.6 })),
  ]
}

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
