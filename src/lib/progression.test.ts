import { describe, expect, it } from 'vitest'
import type { Course } from './course'
import { checkProgression } from './progression'

let seq = 0
const course = (credit: string, grade: string, name = `c${seq++}`): Course => ({
  id: name,
  name,
  credit,
  grade,
})
/** `count` courses, each 10 credits at the given grade. */
const block = (count: number, grade: string): Course[] =>
  Array.from({ length: count }, () => course('10', grade))

describe('checkProgression l1/l2', () => {
  it('passes with 80 credits, GPA 8, and 60 at D3', () => {
    const r = checkProgression('l2', block(8, 'D3')) // 80 credits at 9
    expect(r.met).toBe(true)
  })

  it('fails below 80 credits', () => {
    const r = checkProgression('l2', block(6, 'D3')) // 60 credits
    expect(r.met).toBe(false)
  })
})

describe('checkProgression bsc/msci', () => {
  it('bsc needs 240 credits at GPA 9 and 200 at D3', () => {
    expect(checkProgression('bsc', block(24, 'D3')).met).toBe(true) // GPA 9
  })

  it('msci needs GPA 12, so a GPA 9 record fails', () => {
    expect(checkProgression('msci', block(24, 'D3')).met).toBe(false)
    expect(checkProgression('msci', block(24, 'C3')).met).toBe(true) // GPA 12
  })
})

describe('checkProgression cs-honours', () => {
  it('csh needs GPA 12 over 60 credits at first attempt', () => {
    expect(checkProgression('cs-honours', block(6, 'C3'), 'csh').met).toBe(true)
    expect(checkProgression('cs-honours', block(6, 'D3'), 'csh').met).toBe(false)
  })

  it('a GPA that rounds below 12.0 fails the C3 bar', () => {
    // five C3 (12) and one D1 (11) over 60 credits => 11.83 -> 11.8
    const courses = [...block(5, 'C3'), course('10', 'D1')]
    expect(checkProgression('cs-honours', courses, 'csh').met).toBe(false)
  })

  it('designated only needs GPA 9 with resits allowed', () => {
    expect(checkProgression('cs-honours', block(6, 'D3'), 'designated').met).toBe(true)
  })
})

describe('checkProgression l3/l4', () => {
  it('l3 is met on the BSc bar of 9 and reports the MSci bar separately', () => {
    const bscOnly = checkProgression('l3', block(12, 'D2')) // GPA 10
    expect(bscOnly.met).toBe(true)
    expect(bscOnly.requirements[0].met).toBe(true) // BSc 9.0
    expect(bscOnly.requirements[1].met).toBe(false) // MSci 12.0
  })

  it('l3 fails below 9', () => {
    expect(checkProgression('l3', block(12, 'E1')).met).toBe(false) // GPA 8
  })

  it('l4 needs GPA 12', () => {
    expect(checkProgression('l4', block(12, 'C3')).met).toBe(true)
    expect(checkProgression('l4', block(12, 'D2')).met).toBe(false)
  })
})

describe('checkProgression readiness', () => {
  it('is not ready until a grade is entered', () => {
    expect(checkProgression('l2', []).ready).toBe(false)
    expect(checkProgression('l2', block(1, 'A1')).ready).toBe(true)
  })
})
