import { describe, expect, it } from 'vitest'
import { GRADES, gradeBand, gradePoint, pointToGrade } from './grades'

describe('gradePoint', () => {
  it('maps Schedule A grades to points', () => {
    expect(gradePoint('A1')).toBe(22)
    expect(gradePoint('A5')).toBe(18)
    expect(gradePoint('C3')).toBe(12)
    expect(gradePoint('D3')).toBe(9)
    expect(gradePoint('H')).toBe(0)
  })

  it('is case and whitespace insensitive', () => {
    expect(gradePoint(' a1 ')).toBe(22)
  })

  it('treats unknown grades as 0', () => {
    expect(gradePoint('')).toBe(0)
    expect(gradePoint('ZZ')).toBe(0)
  })
})

describe('pointToGrade', () => {
  it('round-trips with gradePoint for every grade', () => {
    for (const g of GRADES) {
      expect(pointToGrade(gradePoint(g))).toBe(g)
    }
  })

  it('clamps below G2 to H', () => {
    expect(pointToGrade(0)).toBe('H')
  })
})

describe('gradeBand', () => {
  it('returns the leading letter', () => {
    expect(gradeBand('A1')).toBe('A')
    expect(gradeBand('C3')).toBe('C')
    expect(gradeBand('H')).toBe('H')
  })

  it('falls back to H for unknown grades', () => {
    expect(gradeBand('ZZ')).toBe('H')
  })
})
