import { describe, expect, it } from 'vitest'
import type { Course } from './course'
import { bestCreditsGpa, computeYear, creditDistribution, creditsAtOrAbove } from './gpa'

let seq = 0
const course = (credit: string, grade: string, name = `c${seq++}`): Course => ({
  id: name,
  name,
  credit,
  grade,
})

describe('computeYear', () => {
  it('credit-weights the grade points', () => {
    const r = computeYear([course('20', 'A1'), course('20', 'C3')]) // 22 and 12
    expect(r.totalCredit).toBe(40)
    expect(r.gpa).toBeCloseTo(17)
    expect(r.gpa1dp).toBe(17)
    expect(r.countedCount).toBe(2)
  })

  it('ignores courses with no grade, MV, or no credit', () => {
    const r = computeYear([
      course('20', 'A1'),
      course('20', ''),
      course('20', 'MV'),
      course('0', 'A1'),
    ])
    expect(r.totalCredit).toBe(20)
    expect(r.countedCount).toBe(1)
  })

  it('is empty for no counted courses', () => {
    const r = computeYear([])
    expect(r.gpa).toBe(0)
    expect(r.letter).toBe('H')
  })
})

describe('bestCreditsGpa', () => {
  it('takes the highest grades and slices the boundary course', () => {
    const r = bestCreditsGpa([course('40', 'A1'), course('40', 'D3')], 60) // 22 and 9
    // best 40 at 22, then 20 of the 40 at 9 -> (22*40 + 9*20) / 60
    expect(r.credits).toBe(60)
    expect(r.gpa).toBeCloseTo((22 * 40 + 9 * 20) / 60)
  })

  it('reports fewer credits when not enough are available', () => {
    const r = bestCreditsGpa([course('20', 'A1')], 60)
    expect(r.credits).toBe(20)
    expect(r.gpa).toBeCloseTo(22)
  })
})

describe('creditsAtOrAbove', () => {
  it('sums credits at or above the threshold point', () => {
    const courses = [course('20', 'A1'), course('20', 'D3'), course('20', 'E1')] // 22, 9, 8
    expect(creditsAtOrAbove(courses, 9)).toBe(40) // A1 and D3
  })
})

describe('creditDistribution', () => {
  it('reports credit share per band', () => {
    const dist = creditDistribution([course('30', 'A1'), course('10', 'C3')])
    const a = dist.find((d) => d.band === 'A')
    expect(a?.credit).toBe(30)
    expect(a?.fraction).toBeCloseTo(0.75)
  })
})
