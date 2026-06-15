import { Fragment, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import './App.css'
import uogLogo from './assets/UoG.svg'
import type { Course, JointSubject } from './lib/gpa'
import { EXAMPLE_COURSES, computeDegree, computeJoint } from './lib/gpa'
import {
  DEFAULT_HONOURS_WEIGHTS,
  DEFAULT_IM_WEIGHTS,
  DEFAULT_SUBJECT_WEIGHTS,
  buildExport,
  bundleCount,
  downloadFile,
  makeDefaultJointSubjects,
  parseImport,
  readFile,
} from './lib/io'
import type { DataBundle } from './lib/io'
import CourseList from './components/CourseList'
import ResultCard from './components/ResultCard'
import {
  AlertIcon,
  BookIcon,
  CheckIcon,
  DownloadIcon,
  ExternalIcon,
  GithubIcon,
  GraduationIcon,
  MoonIcon,
  RotateIcon,
  SparklesIcon,
  StarIcon,
  SunIcon,
  UploadIcon,
} from './components/Icons'

type Mode = 'year' | 'degree'
type DegreeType = 'honours' | 'joint' | 'integrated'
type Theme = 'light' | 'dark'
type Toast = { kind: 'success' | 'error'; msg: string }

const GRADING_SCHEME_URL = 'https://www.gla.ac.uk/media/Media_124293_smxx.pdf'
const REPO_URL = 'https://github.com/Niox1337/GU-GPA-Calculator-web'

const HONOURS_LABELS = ['Junior Honours', 'Senior Honours']
const IM_LABELS = ['Year 3', 'Year 4', 'Year 5']

function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Private browsing and full storage should not stop the calculator working.
    }
  }, [key, value])

  return [value, setValue]
}

// Example rows need stable React keys, but they should still be treated as fresh form data.
const withIds = (list: Omit<Course, 'id'>[]): Course[] =>
  list.map((c, i) => ({ ...c, id: `ex-${i}-${Math.random().toString(36).slice(2, 7)}` }))

function DegreeSummary({
  years,
  weights,
  labels,
}: {
  years: Course[][]
  weights: number[]
  labels: string[]
}) {
  const r = computeDegree(years, weights)
  const ready = years.some((y) => y.some((c) => c.grade))
  const totalWeight = weights.reduce((s, w) => s + w, 0)

  return (
    <div className="honours-summary">
      <div className="honours-formula">
        {years.map((_, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="formula-op">+</span>}
            <div className="formula-term">
              <span className="formula-label">
                {labels[i]} · {weights[i] ?? 0}%
              </span>
              <span className="formula-value">{ready ? r.yearGpas[i].toFixed(1) : '-'}</span>
            </div>
          </Fragment>
        ))}
        <span className="formula-op">=</span>
        <div className="formula-term formula-term--final">
          <span className="formula-label">Final GPA</span>
          <span className="formula-value">{ready ? r.finalGpa.toFixed(1) : '-'}</span>
        </div>
      </div>

      {totalWeight !== 100 && (
        <p className="weight-note">
          Weights total {totalWeight}%, the final GPA is normalised to that total.
        </p>
      )}

      <div className={`classification${ready ? '' : ' is-empty'}`}>
        <GraduationIcon width={22} height={22} />
        <span>{ready ? r.classification : 'Add grades to see your degree classification'}</span>
      </div>

      {ready && r.borderline && (
        <p className="border-note">
          <strong>Borderline rule 16.37(d):</strong> a GPA of {r.finalGpa.toFixed(1)} falls between
          two bands, so the classification is set by the weighted grade profile, {r.reason}.
        </p>
      )}
    </div>
  )
}

function JointSummary({
  subjects,
  subjectWeights,
}: {
  subjects: JointSubject[]
  subjectWeights: number[]
}) {
  const r = computeJoint(subjects, subjectWeights)
  const ready = subjects.some((s) => s.years.some((y) => y.some((c) => c.grade)))
  const totalWeight = subjectWeights.reduce((s, w) => s + w, 0)

  return (
    <div className="honours-summary">
      <div className="honours-formula">
        {subjects.map((s, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="formula-op">+</span>}
            <div className="formula-term">
              <span className="formula-label">
                {s.name} · {subjectWeights[i] ?? 0}%
              </span>
              <span className="formula-value">{ready ? r.subjectGpas[i].toFixed(1) : '-'}</span>
            </div>
          </Fragment>
        ))}
        <span className="formula-op">=</span>
        <div className="formula-term formula-term--final">
          <span className="formula-label">Joint GPA</span>
          <span className="formula-value">{ready ? r.finalGpa.toFixed(1) : '-'}</span>
        </div>
      </div>

      {totalWeight !== 100 && (
        <p className="weight-note">
          Subject weights total {totalWeight}%, the joint GPA is normalised to that total.
        </p>
      )}

      <div className={`classification${ready ? '' : ' is-empty'}`}>
        <GraduationIcon width={22} height={22} />
        <span>{ready ? r.classification : 'Add grades to see your degree classification'}</span>
      </div>

      {ready && r.borderline && (
        <p className="border-note">
          <strong>Borderline rule 16.37(d):</strong> a joint GPA of {r.finalGpa.toFixed(1)} falls
          between two bands, so the classification is set by the weighted grade profile, {r.reason}.
        </p>
      )}
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = usePersistentState<Theme>('gpa.theme', 'light')
  const [mode, setMode] = usePersistentState<Mode>('gpa.mode', 'year')
  const [year, setYear] = usePersistentState<Course[]>('gpa.year', withIds(EXAMPLE_COURSES))
  const [degreeType, setDegreeType] = usePersistentState<DegreeType>('gpa.degreeType', 'honours')
  const [honoursYears, setHonoursYears] = usePersistentState<Course[][]>('gpa.honoursYears', [[], []])
  const [honoursWeights, setHonoursWeights] = usePersistentState<number[]>(
    'gpa.honoursWeights',
    DEFAULT_HONOURS_WEIGHTS,
  )
  const [imYears, setImYears] = usePersistentState<Course[][]>('gpa.imYears', [[], [], []])
  const [imWeights, setImWeights] = usePersistentState<number[]>('gpa.imWeights', DEFAULT_IM_WEIGHTS)
  const [jointSubjects, setJointSubjects] = usePersistentState<JointSubject[]>(
    'gpa.jointSubjects',
    makeDefaultJointSubjects(),
  )
  const [jointSubjectWeights, setJointSubjectWeights] = usePersistentState<number[]>(
    'gpa.jointSubjectWeights',
    DEFAULT_SUBJECT_WEIGHTS,
  )

  const [toast, setToast] = useState<Toast | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

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

  const currentBundle = (): DataBundle => ({
    year,
    honoursYears,
    honoursWeights,
    jointSubjects,
    jointSubjectWeights,
    imYears,
    imWeights,
  })

  const resetCurrent = () => {
    if (mode === 'year') setYear([])
    else if (isJoint) {
      setJointSubjects((prev) => prev.map((s) => ({ ...s, years: s.years.map(() => []) })))
    } else setYears(years.map(() => []))
  }

  const handleExport = () => {
    const bundle = currentBundle()
    const count = bundleCount(bundle)
    if (count === 0) {
      setToast({ kind: 'error', msg: 'Nothing to export yet, add some courses first.' })
      return
    }
    const stamp = new Date().toISOString().slice(0, 10)
    downloadFile(`glasgow-gpa-${stamp}.json`, buildExport(bundle))
    setToast({ kind: 'success', msg: `Exported ${count} course${count === 1 ? '' : 's'}.` })
  }

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file
    if (!file) return

    if (bundleCount(currentBundle()) > 0 && !window.confirm('Importing will replace your current courses. Continue?')) {
      return
    }

    try {
      const bundle = parseImport(await readFile(file))
      setYear(bundle.year)
      setHonoursYears(bundle.honoursYears)
      setHonoursWeights(bundle.honoursWeights)
      setJointSubjects(bundle.jointSubjects)
      setJointSubjectWeights(bundle.jointSubjectWeights)
      setImYears(bundle.imYears)
      setImWeights(bundle.imWeights)
      const count = bundleCount(bundle)
      setToast({ kind: 'success', msg: `Imported ${count} course${count === 1 ? '' : 's'}.` })
    } catch (err) {
      setToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Could not import that file.' })
    }
  }

  const degreeHasData = isJoint
    ? jointSubjects.some((s) => s.years.some((y) => y.length > 0))
    : years.some((y) => y.length > 0)

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <a
            href={GRADING_SCHEME_URL}
            target="_blank"
            rel="noreferrer"
            className="brand-logo"
            title="View the University of Glasgow grading scheme"
          >
            <img src={uogLogo} alt="University of Glasgow" />
          </a>
          <div className="brand-text">
            <h1>Glasgow GPA Calculator</h1>
            <p>University of Glasgow - Schedule A (22-point scale)</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import grades from a file"
          >
            <UploadIcon width={18} height={18} />
            <span className="btn-text">Import</span>
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleExport}
            aria-label="Export grades to a file"
          >
            <DownloadIcon width={18} height={18} />
            <span className="btn-text">Export</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={handleImportFile}
            aria-hidden="true"
            tabIndex={-1}
          />
          <a className="btn btn--ghost" href={GRADING_SCHEME_URL} target="_blank" rel="noreferrer">
            <BookIcon width={18} height={18} />
            <span className="btn-text">Grading scheme</span>
            <ExternalIcon width={15} height={15} />
          </a>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="Calculator mode">
        <button
          role="tab"
          aria-selected={mode === 'year'}
          className={`tab${mode === 'year' ? ' is-active' : ''}`}
          onClick={() => setMode('year')}
        >
          Single year
        </button>
        <button
          role="tab"
          aria-selected={mode !== 'year'}
          className={`tab${mode !== 'year' ? ' is-active' : ''}`}
          onClick={() => setMode('degree')}
        >
          Degree classification
        </button>
      </div>

      <main className="app-main">
        {mode === 'year' ? (
          <div className="layout">
            <section className="panel" aria-label="Courses">
              <div className="panel-head">
                <h2>Your courses</h2>
                <div className="panel-tools">
                  {year.length === 0 && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setYear(withIds(EXAMPLE_COURSES))}
                    >
                      <SparklesIcon width={16} height={16} />
                      Load example
                    </button>
                  )}
                  {year.length > 0 && (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={resetCurrent}>
                      <RotateIcon width={16} height={16} />
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <CourseList courses={year} onChange={setYear} idPrefix="year" />
            </section>
            <aside className="panel panel--result">
              <ResultCard courses={year} />
            </aside>
          </div>
        ) : (
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
                              onChange={(e) =>
                                setSubjectYearWeight(si, yi, Number(e.target.value) || 0)
                              }
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
        )}
      </main>

      <a className="star-cta" href={REPO_URL} target="_blank" rel="noreferrer">
        <GithubIcon width={22} height={22} className="star-cta__gh" />
        <span className="star-cta__text">
          <strong>Enjoying the calculator?</strong>
          <span>Star it on GitHub to support the project.</span>
        </span>
        <span className="star-cta__btn">
          <StarIcon width={16} height={16} />
          Star
        </span>
      </a>

      <footer className="app-footer">
        <p>
          Grades follow the{' '}
          <a href={GRADING_SCHEME_URL} target="_blank" rel="noreferrer">
            UofG Schedule A
          </a>{' '}
          scale (A1 = 22 down to H = 0). Calculations stay in your browser.
        </p>
      </footer>

      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className={`toast toast--${toast.kind}`}>
            {toast.kind === 'success' ? (
              <CheckIcon width={18} height={18} />
            ) : (
              <AlertIcon width={18} height={18} />
            )}
            <span>{toast.msg}</span>
          </div>
        )}
      </div>
    </div>
  )
}
