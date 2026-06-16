import { describe, expect, it } from 'vitest'
import type { Course } from './course'
import type { DataBundle } from './io'
import {
  DEFAULT_HONOURS_WEIGHTS,
  DEFAULT_IM_WEIGHTS,
  DEFAULT_SUBJECT_WEIGHTS,
  buildExport,
  bundleCount,
  makeDefaultJointSubjects,
  parseImport,
} from './io'

const course = (name: string, credit: string, grade: string): Course => ({
  id: name,
  name,
  credit,
  grade,
})

const bundle = (over: Partial<DataBundle> = {}): DataBundle => ({
  year: [],
  honoursYears: [[], []],
  honoursWeights: [...DEFAULT_HONOURS_WEIGHTS],
  jointSubjects: makeDefaultJointSubjects(),
  jointSubjectWeights: [...DEFAULT_SUBJECT_WEIGHTS],
  imYears: [[], [], []],
  imWeights: [...DEFAULT_IM_WEIGHTS],
  ...over,
})

describe('buildExport / parseImport', () => {
  it('round-trips course data', () => {
    const original = bundle({ year: [course('Maths', '20', 'A1'), course('Physics', '10', 'C3')] })
    const parsed = parseImport(buildExport(original))
    expect(parsed.year.map((c) => [c.name, c.credit, c.grade])).toEqual([
      ['Maths', '20', 'A1'],
      ['Physics', '10', 'C3'],
    ])
  })

  it('coerces unknown grades to "not taken"', () => {
    const parsed = parseImport(buildExport(bundle({ year: [course('X', '20', 'ZZ')] })))
    expect(parsed.year[0].grade).toBe('')
  })

  it('maps a legacy junior/senior file onto the Honours years', () => {
    const legacy = JSON.stringify({
      data: { junior: [{ name: 'J', credit: 20, grade: 'A1' }], senior: [{ name: 'S', credit: 20, grade: 'B1' }] },
    })
    const parsed = parseImport(legacy)
    expect(parsed.honoursYears[0][0].name).toBe('J')
    expect(parsed.honoursYears[1][0].name).toBe('S')
  })

  it('rejects a file with no courses', () => {
    expect(() => parseImport(buildExport(bundle()))).toThrow()
  })
})

describe('bundleCount', () => {
  it('counts courses across every dataset', () => {
    expect(bundleCount(bundle({ year: [course('A', '20', 'A1')], imYears: [[course('B', '20', 'B1')], [], []] }))).toBe(2)
  })
})
