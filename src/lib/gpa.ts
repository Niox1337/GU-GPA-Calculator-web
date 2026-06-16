// Credit-weighted GPA maths on the Schedule A scale.
// GPA is the credit-weighted average of grade points. Courses without a recorded
// grade are left out of both the numerator and denominator.
import type { Course, Step } from './course'
import { isCounted, sumCredits } from './course'
import { BAND_LABELS, gradeBand, gradePoint, pointToGrade } from './grades'

export interface YearResult {
  totalCredit: number
  gpa: number
  gpa1dp: number
  letter: string
  steps: Step[]
  countedCount: number
}

/** Calculates one year's GPA and keeps the per-course contribution for the breakdown table. */
export function computeYear(courses: Course[]): YearResult {
  const counted = courses.filter(isCounted)
  const totalCredit = sumCredits(counted)

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

/** Calculates credit share per grade band for the distribution visual. */
export function creditDistribution(courses: Course[]): Distribution[] {
  const counted = courses.filter(isCounted)
  const total = sumCredits(counted)
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

/** One weighted entry in a degree grade profile (credit- and year-weighted). */
export interface ProfileEntry {
  band: string
  weight: number
}

/** Credit-weighted grade profile for a single year (weights sum to 1). */
export function yearProfile(courses: Course[]): ProfileEntry[] {
  const counted = courses.filter(isCounted)
  const total = sumCredits(counted)
  if (!total) return []
  return counted.map((c) => ({ band: gradeBand(c.grade), weight: Number(c.credit) / total }))
}

/** Share of the weighted profile at the given grade bands from 0 to 1. */
export function bandShare(profile: ProfileEntry[], bands: string[]): number {
  const total = profile.reduce((s, p) => s + p.weight, 0)
  if (!total) return 0
  const inBands = profile
    .filter((p) => bands.includes(p.band))
    .reduce((s, p) => s + p.weight, 0)
  return inBands / total
}

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
