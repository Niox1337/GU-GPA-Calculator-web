import { describe, expect, it } from 'vitest'
import type { Course } from './course'
import type { ProfileEntry } from './gpa'
import {
  classifyHonours,
  classifyPGT,
  computeDegree,
  computeHonours,
  computeJoint,
} from './classification'

let seq = 0
const course = (credit: string, grade: string, name = `c${seq++}`): Course => ({
  id: name,
  name,
  credit,
  grade,
})
const profile = (band: string): ProfileEntry[] => [{ band, weight: 1 }]

describe('classifyHonours', () => {
  it('uses direct bands away from the borderlines', () => {
    expect(classifyHonours(18, []).classification).toBe('First Class Honours')
    expect(classifyHonours(15, []).classification).toBe('Upper Second Class Honours (2:1)')
    expect(classifyHonours(12, []).classification).toBe('Lower Second Class Honours (2:2)')
    expect(classifyHonours(9, []).classification).toBe('Third Class Honours')
    expect(classifyHonours(8, []).classification).toBe('Below Honours Standard')
  })

  it('resolves a 16.37(d) borderline by the grade profile', () => {
    const high = classifyHonours(17.2, profile('A'))
    expect(high.borderline).toBe(true)
    expect(high.classification).toBe('First Class Honours')

    const low = classifyHonours(17.2, profile('B'))
    expect(low.borderline).toBe(true)
    expect(low.classification).toBe('Upper Second Class Honours (2:1)')
  })
})

describe('computeHonours', () => {
  it('weights junior 40% and senior 60%', () => {
    const r = computeHonours([course('20', 'A1')], [course('20', 'C3')]) // 22 and 12
    expect(r.juniorGpa).toBe(22)
    expect(r.seniorGpa).toBe(12)
    expect(r.finalGpa).toBeCloseTo(16) // 22*0.4 + 12*0.6
  })
})

describe('classifyPGT', () => {
  it('awards a Distinction when overall, taught, and project all clear', () => {
    const r = classifyPGT([course('60', 'A1', 'Project'), course('120', 'A1', 'Taught')])
    expect(r.classification).toBe('Distinction')
  })

  it('falls to Pass when the overall GPA is low', () => {
    const r = classifyPGT([course('60', 'C3', 'Project'), course('120', 'C3', 'Taught')])
    expect(r.classification).toBe('Pass')
  })
})

describe('computeDegree and computeJoint', () => {
  it('combines years by weight', () => {
    const r = computeDegree([[course('20', 'A1')], [course('20', 'C3')]], [40, 60])
    expect(r.yearGpas).toEqual([22, 12])
    expect(r.finalGpa).toBeCloseTo(16)
  })

  it('combines joint subjects by weight', () => {
    const r = computeJoint(
      [
        { name: 'X', years: [[course('20', 'A1')]], yearWeights: [100] },
        { name: 'Y', years: [[course('20', 'C3')]], yearWeights: [100] },
      ],
      [50, 50],
    )
    expect(r.subjectGpas).toEqual([22, 12])
    expect(r.finalGpa).toBeCloseTo(17)
  })
})
