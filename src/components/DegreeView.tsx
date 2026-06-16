import type { Dispatch, SetStateAction } from 'react'
import type { Course, JointSubject } from '../lib'
import { usePersistentState } from '../hooks/usePersistentState'
import CourseList from './CourseList'
import DegreeSummary from './DegreeSummary'
import JointSummary from './JointSummary'
import { RotateIcon } from './Icons'

type DegreeType = 'honours' | 'joint' | 'integrated'

const HONOURS_LABELS = ['Junior Honours', 'Senior Honours']
const IM_LABELS = ['Year 3', 'Year 4', 'Year 5']

interface Props {
  honoursYears: Course[][]
  setHonoursYears: Dispatch<SetStateAction<Course[][]>>
  honoursWeights: number[]
  setHonoursWeights: Dispatch<SetStateAction<number[]>>
  imYears: Course[][]
  setImYears: Dispatch<SetStateAction<Course[][]>>
  imWeights: number[]
  setImWeights: Dispatch<SetStateAction<number[]>>
  jointSubjects: JointSubject[]
  setJointSubjects: Dispatch<SetStateAction<JointSubject[]>>
  jointSubjectWeights: number[]
  setJointSubjectWeights: Dispatch<SetStateAction<number[]>>
}

/** Degree classification mode: Honours, Joint Honours, or Integrated Masters. */
export default function DegreeView({
  honoursYears,
  setHonoursYears,
  honoursWeights,
  setHonoursWeights,
  imYears,
  setImYears,
  imWeights,
  setImWeights,
  jointSubjects,
  setJointSubjects,
  jointSubjectWeights,
  setJointSubjectWeights,
}: Props) {
  const [degreeType, setDegreeType] = usePersistentState<DegreeType>('gpa.degreeType', 'honours')

  const isJoint = degreeType === 'joint'
  const isHonours = degreeType === 'honours'
  const years = isHonours ? honoursYears : imYears
  const setYears = isHonours ? setHonoursYears : setImYears
  const weights = isHonours ? honoursWeights : imWeights
  const setWeights = isHonours ? setHonoursWeights : setImWeights
  const yearLabels = isHonours ? HONOURS_LABELS : IM_LABELS

  const setYearAt = (i: number, courses: Course[]) =>
    setYears((prev) => prev.map((y, idx) => (idx === i ? courses : y)))
  const setWeightAt = (i: number, w: number) =>
    setWeights((prev) => prev.map((x, idx) => (idx === i ? w : x)))

  // Joint Honours updaters (subject -> year -> courses/weights).
  const setSubjectName = (si: number, name: string) =>
    setJointSubjects((prev) => prev.map((s, i) => (i === si ? { ...s, name } : s)))
  const setSubjectYear = (si: number, yi: number, courses: Course[]) =>
    setJointSubjects((prev) =>
      prev.map((s, i) =>
        i === si ? { ...s, years: s.years.map((y, j) => (j === yi ? courses : y)) } : s,
      ),
    )
  const setSubjectYearWeight = (si: number, yi: number, w: number) =>
    setJointSubjects((prev) =>
      prev.map((s, i) =>
        i === si ? { ...s, yearWeights: s.yearWeights.map((x, j) => (j === yi ? w : x)) } : s,
      ),
    )
  const setSubjectWeightAt = (si: number, w: number) =>
    setJointSubjectWeights((prev) => prev.map((x, i) => (i === si ? w : x)))

  const resetCurrent = () => {
    if (isJoint) {
      setJointSubjects((prev) => prev.map((s) => ({ ...s, years: s.years.map(() => []) })))
    } else setYears(years.map(() => []))
  }

  const degreeHasData = isJoint
    ? jointSubjects.some((s) => s.years.some((y) => y.length > 0))
    : years.some((y) => y.length > 0)

  return (
    <div className="honours-layout">
      <div className="degree-switch" role="tablist" aria-label="Degree type">
        <button
          role="tab"
          aria-selected={isHonours}
          className={`seg${isHonours ? ' is-active' : ''}`}
          onClick={() => setDegreeType('honours')}
        >
          Honours
        </button>
        <button
          role="tab"
          aria-selected={isJoint}
          className={`seg${isJoint ? ' is-active' : ''}`}
          onClick={() => setDegreeType('joint')}
        >
          Joint Honours
        </button>
        <button
          role="tab"
          aria-selected={degreeType === 'integrated'}
          className={`seg${degreeType === 'integrated' ? ' is-active' : ''}`}
          onClick={() => setDegreeType('integrated')}
        >
          Integrated Masters
        </button>
      </div>

      <p className="honours-intro">
        {isHonours && 'Honours combines your two Honours years.'}
        {isJoint &&
          'Joint Honours aggregates each subject over its own years, then combines the two subjects (usually 50:50).'}
        {degreeType === 'integrated' && 'Integrated Masters combines your final three years.'}{' '}
        Weights are editable and are normalised to their total.
      </p>

      {isJoint ? (
        <div className="joint-grid">
          {jointSubjects.map((subject, si) => (
            <section className="panel joint-subject" key={si} aria-label={subject.name}>
              <div className="panel-head joint-subject-head">
                <input
                  className="subject-name"
                  value={subject.name}
                  onChange={(e) => setSubjectName(si, e.target.value)}
                  aria-label={`Subject ${si + 1} name`}
                />
                <label className="weight-field" title="Subject weighting">
                  <span className="weight-prefix">subject</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    inputMode="numeric"
                    value={jointSubjectWeights[si] ?? 0}
                    onChange={(e) => setSubjectWeightAt(si, Number(e.target.value) || 0)}
                    aria-label={`${subject.name} weight, percent`}
                  />
                  <span>%</span>
                </label>
              </div>

              {subject.years.map((yearCourses, yi) => (
                <div className="joint-year" key={yi}>
                  <div className="joint-year-head">
                    <h3>{HONOURS_LABELS[yi]}</h3>
                    <label className="weight-field" title="Year weighting within this subject">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        inputMode="numeric"
                        value={subject.yearWeights[yi] ?? 0}
                        onChange={(e) => setSubjectYearWeight(si, yi, Number(e.target.value) || 0)}
                        aria-label={`${subject.name} ${HONOURS_LABELS[yi]} weight, percent`}
                      />
                      <span>%</span>
                    </label>
                  </div>
                  <CourseList
                    courses={yearCourses}
                    onChange={(c) => setSubjectYear(si, yi, c)}
                    idPrefix={`joint-${si}-${yi}`}
                  />
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="honours-grid">
          {years.map((yearCourses, i) => (
            <section className="panel" key={`${degreeType}-${i}`} aria-label={`${yearLabels[i]} courses`}>
              <div className="panel-head">
                <h2>{yearLabels[i]}</h2>
                <label className="weight-field" title={`${yearLabels[i]} programme weighting`}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    inputMode="numeric"
                    value={weights[i] ?? 0}
                    onChange={(e) => setWeightAt(i, Number(e.target.value) || 0)}
                    aria-label={`${yearLabels[i]} weight, percent`}
                  />
                  <span>%</span>
                </label>
              </div>
              <CourseList
                courses={yearCourses}
                onChange={(c) => setYearAt(i, c)}
                idPrefix={`${degreeType}-${i}`}
              />
            </section>
          ))}
        </div>
      )}

      <section className="panel panel--result">
        <div className="panel-head">
          <h2>Degree classification</h2>
          {degreeHasData && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetCurrent}>
              <RotateIcon width={16} height={16} />
              Clear
            </button>
          )}
        </div>
        {isJoint ? (
          <JointSummary subjects={jointSubjects} subjectWeights={jointSubjectWeights} />
        ) : (
          <DegreeSummary years={years} weights={weights} labels={yearLabels} />
        )}
      </section>
    </div>
  )
}
