import type { Course, CsDegree, ProgressionTarget } from '../lib'
import { CS_L2_COURSES, withIds } from '../lib'
import { usePersistentState } from '../hooks/usePersistentState'
import ProgressionCheck from './ProgressionCheck'

/**
 * Progression mode. Owns its own persisted state since none of it is part of the
 * import/export bundle. Each target reads and writes its own course list:
 *   l1, l2            -> shared general list
 *   bsc, msci         -> shared full-record list
 *   l3, l4            -> their own level lists
 *   cs-honours        -> six fixed Level 2 courses, grades only
 */
export default function ProgressionView() {
  const [target, setTarget] = usePersistentState<ProgressionTarget>('gpa.progressionTarget', 'l2')
  const [csDegree, setCsDegree] = usePersistentState<CsDegree>('gpa.csDegree', 'csh')
  const [generalCourses, setGeneralCourses] = usePersistentState<Course[]>('gpa.progressionCourses', [])
  const [l3Courses, setL3Courses] = usePersistentState<Course[]>('gpa.progressionL3', [])
  const [l4Courses, setL4Courses] = usePersistentState<Course[]>('gpa.progressionL4', [])
  const [honoursCourses, setHonoursCourses] = usePersistentState<Course[]>('gpa.honoursCourses', [])
  // Computing Honours shows the six fixed Level 2 courses, so only the grades are
  // stored (keyed by course name) and the list is rebuilt from CS_L2_COURSES.
  const [csHonoursGrades, setCsHonoursGrades] = usePersistentState<Record<string, string>>(
    'gpa.csHonoursGrades',
    {},
  )

  const csHonoursCourses: Course[] = CS_L2_COURSES.map((c) => ({
    ...c,
    id: c.name,
    grade: csHonoursGrades[c.name] ?? '',
  }))
  const setCsHonoursCourses = (next: Course[]) =>
    setCsHonoursGrades(Object.fromEntries(next.map((c) => [c.name, c.grade])))

  // Pick the course list and setter for the active target.
  const buckets: Record<ProgressionTarget, [Course[], (c: Course[]) => void]> = {
    l1: [generalCourses, setGeneralCourses],
    l2: [generalCourses, setGeneralCourses],
    bsc: [honoursCourses, setHonoursCourses],
    msci: [honoursCourses, setHonoursCourses],
    l3: [l3Courses, setL3Courses],
    l4: [l4Courses, setL4Courses],
    'cs-honours': [csHonoursCourses, setCsHonoursCourses],
  }
  const [courses, onChange] = buckets[target]

  // Copy the Computing Honours courses (with grades) into the BSc Honours list,
  // skipping any already present by name, then switch to that tab.
  const transferToBsc = () => {
    setHonoursCourses((prev) => {
      const existing = new Set(prev.map((c) => c.name))
      const additions = csHonoursCourses
        .filter((c) => !existing.has(c.name))
        .map(({ name, credit, grade }) => ({ name, credit, grade }))
      return [...prev, ...withIds(additions)]
    })
    setTarget('bsc')
  }

  return (
    <ProgressionCheck
      target={target}
      onTargetChange={setTarget}
      csDegree={csDegree}
      onCsDegreeChange={setCsDegree}
      courses={courses}
      onChange={onChange}
      onTransferToBsc={transferToBsc}
    />
  )
}
