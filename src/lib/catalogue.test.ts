import { describe, expect, it } from 'vitest'
import {
  COURSE_CATALOGUE,
  checkCsRules,
  courseBaseName,
  csYearFilter,
  STRANDS_BY_NAME,
  strandProgress,
} from './catalogue'

const namesFor = (year: number) =>
  COURSE_CATALOGUE.filter(csYearFilter(year)).map((c) => c.code)

describe('csYearFilter', () => {
  it('years 1-2 show only levels 1 and 2', () => {
    for (const y of [1, 2]) {
      const levels = COURSE_CATALOGUE.filter(csYearFilter(y)).map((c) => c.level)
      expect(levels.length).toBeGreaterThan(0)
      expect(levels.every((l) => l <= 2)).toBe(true)
    }
  })

  it('year 3 is exactly the allow-list (pre-loaded plus electives)', () => {
    const codes = namesFor(3)
    expect(codes).toContain('COMPSCI4009') // pre-loaded Algorithmics I
    expect(codes).toContain('COMPSCI4105') // Quantum Computing elective
    expect(codes).not.toContain('COMPSCI1006') // level 1 excluded
  })

  it('maps a multi-strand course to its specialisms', () => {
    expect(STRANDS_BY_NAME.get('functional programming (h)')).toEqual([
      'Parallel and Distributed Systems',
      'Theoretical Computer Science',
    ])
  })

  it('counts picked optionals and flags compulsory courses per strand', () => {
    const picked = new Set([
      'database systems (h)', // Data Management compulsory
      'machine learning (h)', // Data Management optional
      'web science (h)', // Data Management optional
    ])
    const dm = strandProgress(picked).find((r) => r.strand === 'Data Management')!
    expect(dm.minOptional).toBe(4)
    expect(dm.pickedOptional).toBe(2)
    expect(dm.compulsory).toEqual([{ name: 'Database Systems (H)', picked: true }])
  })

  it('checks security, RMT, project and level-M credits', () => {
    const r = checkCsRules([
      { name: 'Cyber Security Fundamentals (H)', credit: 10 }, // Information Security strand
      { name: 'Research Methods And Techniques (M) for MSci', credit: 10 }, // level 5
      { name: 'MSci Research Proposal and Project', credit: 80 }, // level 5 project
      { name: 'Algorithmics I (H)', credit: 10 }, // level 4, not counted toward level M
    ])
    expect(r.hasSecurity).toBe(true)
    expect(r.hasRmt).toBe(true)
    expect(r.hasProject).toBe(true)
    expect(r.levelMCredits).toBe(90)
  })

  it('year 4 shows only levels 4-5 in School of Computing Science', () => {
    const courses = COURSE_CATALOGUE.filter(csYearFilter(4))
    expect(courses.length).toBeGreaterThan(0)
    expect(courses.every((c) => c.level >= 4 && c.school === 'School of Computing Science')).toBe(true)
  })

  it('collapses (H) and (M) variants to one base name', () => {
    const ml = courseBaseName('Machine Learning (H)')
    expect(courseBaseName('Machine Learning (M)')).toBe(ml)
    expect(courseBaseName('Quantum Computing H')).toBe('quantum computing')
    expect(courseBaseName('Research Methods And Techniques (M) for MSci')).toBe(
      'research methods and techniques',
    )
  })

  it('year 5 shows only level M (level 5) in School of Computing Science', () => {
    const courses = COURSE_CATALOGUE.filter(csYearFilter(5))
    expect(courses.length).toBeGreaterThan(0)
    expect(courses.every((c) => c.level === 5 && c.school === 'School of Computing Science')).toBe(true)
  })
})
