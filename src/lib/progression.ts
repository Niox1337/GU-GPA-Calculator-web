// College of Science & Engineering and School of Computing Science progression
// rules, expressed as a registry so a new target is a single entry.
// Sources:
//   https://www.gla.ac.uk/colleges/scienceengineering/students/scienceprogresscommitteecose-spc/
//   SoCS "Introduction to Computing Science Honours" Level 3 entry briefing.
import type { Course } from './course'
import { isCounted, sumCredits } from './course'
import { gradePoint, pointToGrade } from './grades'
import { bestCreditsGpa, computeYear, creditsAtOrAbove } from './gpa'

// Schedule A thresholds reused below. D3 = 9 is the minimum pass; the Computing
// Science Honours entry rule uses C3 = 12.
const D3_POINTS = gradePoint('D3')
const C3_POINTS = gradePoint('C3')

const round1 = (n: number) => Math.round(n * 10) / 10

export type ProgressionTarget = 'l1' | 'l2' | 'bsc' | 'msci' | 'cs-honours' | 'l3' | 'l4'

// School of Computing Science Level 3 entry programmes. Each sets the GPA
// threshold, the credit base it is measured over, and whether resits count.
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
  /** True only when the verdict is met (every requirement, or a rule-specific bar). */
  met: boolean
  /** False until at least one course has a grade, so the UI can stay neutral. */
  ready: boolean
  requirements: Requirement[]
}

// ---------------------------------------------------------------------------
// Shared requirement builders
// ---------------------------------------------------------------------------

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

/** A "GPA of at least X over a whole level" requirement, using the level GPA. */
function levelGpaRequirement(label: string, levelGpa: number, threshold: number, levelLabel: string): Requirement {
  return {
    label,
    met: levelGpa >= threshold,
    detail: `${levelLabel} GPA ${levelGpa.toFixed(1)}`,
  }
}

// ---------------------------------------------------------------------------
// Registry: one entry per progression target
// ---------------------------------------------------------------------------

export interface ProgressionContext {
  csDegree: CsDegree
}

export interface ProgressionRule {
  /**
   * Evaluate the counted courses, returning the per-rule checklist and an
   * optional verdict override. When `met` is omitted, the verdict is "every
   * requirement met".
   */
  evaluate(counted: Course[], ctx: ProgressionContext): { requirements: Requirement[]; met?: boolean }
}

// Within-level §3.1 rule shared by Level 1->2 and Level 2->3.
const levelRule: ProgressionRule = {
  evaluate(counted) {
    return {
      requirements: [
        creditRequirement(sumCredits(counted), 80),
        gpaRequirement(counted, 80, 8),
        d3Requirement(counted, 60),
      ],
    }
  },
}

// §15.1 Honours/Integrated Masters entry: 240 credits, a GPA bar, 200 at D3.
const honoursEntryRule = (threshold: number): ProgressionRule => ({
  evaluate(counted) {
    return {
      requirements: [
        creditRequirement(sumCredits(counted), 240),
        gpaRequirement(counted, 240, threshold),
        d3Requirement(counted, 200),
      ],
    }
  },
})

// School of Computing Science Level 3 entry, varying by programme.
const csHonoursRule: ProgressionRule = {
  evaluate(counted, { csDegree }) {
    const spec = CS_SPECS[csDegree]
    const best = bestCreditsGpa(counted, spec.credits)
    const gpa = round1(best.gpa)
    const firstAttempt = spec.firstAttempt ? ' at first attempt' : ''
    return {
      requirements: [
        creditRequirement(sumCredits(counted), spec.credits, 'credits of Level 2 computing courses'),
        {
          label: `GPA of at least ${spec.threshold.toFixed(1)} (${pointToGrade(spec.threshold)}) over ${spec.credits} credits${firstAttempt}`,
          met: best.credits >= spec.credits && gpa >= spec.threshold,
          detail:
            best.credits >= spec.credits
              ? `GPA ${gpa.toFixed(1)} over the best ${spec.credits} credits`
              : `Only ${best.credits} of ${spec.credits} credits available`,
        },
      ],
    }
  },
}

// Level 3 -> 4: banded. BSc needs 9.0, MSci needs 12.0; the verdict is the BSc bar.
const l3Rule: ProgressionRule = {
  evaluate(counted) {
    const gpa = computeYear(counted).gpa1dp
    return {
      requirements: [
        levelGpaRequirement('GPA of at least 9.0 over Level 3 (BSc progression to Level 4)', gpa, 9, 'Level 3'),
        levelGpaRequirement('GPA of at least 12.0 over Level 3 (MSci progression to Level 4)', gpa, 12, 'Level 3'),
      ],
      // BSc progression is the minimum bar; below 9.0 means switching to a designated degree.
      met: gpa >= 9,
    }
  },
}

// Level 4 -> 5: MSci only, needs 12.0 over Level 4.
const l4Rule: ProgressionRule = {
  evaluate(counted) {
    const gpa = computeYear(counted).gpa1dp
    return {
      requirements: [
        levelGpaRequirement('GPA of at least 12.0 over Level 4 (MSci progression to Level 5)', gpa, 12, 'Level 4'),
      ],
    }
  },
}

export const PROGRESSION_RULES: Record<ProgressionTarget, ProgressionRule> = {
  l1: levelRule,
  l2: levelRule,
  bsc: honoursEntryRule(9),
  msci: honoursEntryRule(12),
  'cs-honours': csHonoursRule,
  l3: l3Rule,
  l4: l4Rule,
}

/**
 * Evaluate a student's courses against the progression rule for the chosen
 * target, reporting each rule separately so the UI can show a per-rule checklist.
 */
export function checkProgression(
  target: ProgressionTarget,
  courses: Course[],
  csDegree: CsDegree = 'csh',
): ProgressionResult {
  const counted = courses.filter(isCounted)
  const ready = counted.length > 0
  const { requirements, met } = PROGRESSION_RULES[target].evaluate(counted, { csDegree })
  return { met: met ?? requirements.every((r) => r.met), ready, requirements }
}
