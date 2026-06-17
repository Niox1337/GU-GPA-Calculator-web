import { describe, expect, it } from 'vitest'
import type { YearCourse } from './programme'
import {
  PRE_HONOURS_TARGET,
  coursesInTerm,
  creditStatus,
  makeDefaultProgramme,
  makeYear,
  preHonoursCredits,
  runsIn,
  yearCreditTotal,
} from './programme'

const yc = (name: string, credit: string, term: YearCourse['term']): YearCourse => ({
  id: name,
  name,
  credit,
  grade: '',
  term,
})

describe('makeYear / makeDefaultProgramme', () => {
  it('creates a year with an empty shared course list', () => {
    const year = makeYear('Year 1')
    expect(year.courses).toEqual([])
    expect(year.weight).toBe(0)
  })

  it('builds a four-year default with the 40 / 60 honours weighting', () => {
    const programme = makeDefaultProgramme()
    expect(programme.map((y) => y.name)).toEqual(['Year 1', 'Year 2', 'Year 3', 'Year 4'])
    expect(programme.map((y) => y.weight)).toEqual([0, 0, 40, 60])
  })
})

describe('runsIn / coursesInTerm', () => {
  it('shows a "both" course in each semester section', () => {
    const year = {
      ...makeYear('Y3'),
      courses: [yc('A', '20', 's1'), yc('B', '20', 's2'), yc('C', '20', 'both')],
    }
    expect(coursesInTerm(year, 's1').map((c) => c.name)).toEqual(['A', 'C'])
    expect(coursesInTerm(year, 's2').map((c) => c.name)).toEqual(['B', 'C'])
    expect(runsIn(yc('C', '20', 'both'), 's1')).toBe(true)
    expect(runsIn(yc('A', '20', 's1'), 's2')).toBe(false)
  })
})

describe('yearCreditTotal', () => {
  it('counts a "both" course once, not twice', () => {
    const year = {
      ...makeYear('Y3'),
      courses: [yc('A', '60', 's1'), yc('B', '60', 'both')],
    }
    expect(yearCreditTotal(year)).toBe(120)
  })
})

describe('preHonoursCredits', () => {
  it('combines only the first two years toward the 240 target', () => {
    const programme = makeDefaultProgramme()
    programme[0].courses = [yc('A', '120', 's1')]
    programme[1].courses = [yc('B', '120', 's2')]
    programme[2].courses = [yc('C', '120', 's1')]
    expect(preHonoursCredits(programme)).toBe(240)
    expect(creditStatus(preHonoursCredits(programme), PRE_HONOURS_TARGET).status).toBe('on-target')
  })
})

describe('creditStatus', () => {
  it('flags under, on-target, and over', () => {
    expect(creditStatus(100, 120)).toMatchObject({ status: 'under', diff: -20 })
    expect(creditStatus(120, 120)).toMatchObject({ status: 'on-target', diff: 0 })
    expect(creditStatus(140, 120)).toMatchObject({ status: 'over', diff: 20 })
  })
})
