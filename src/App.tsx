import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import './App.css'
import uogLogo from './assets/UoG.svg'
import type { Course } from './lib/gpa'
import { EXAMPLE_COURSES, computeHonours } from './lib/gpa'
import CourseList from './components/CourseList'
import ResultCard from './components/ResultCard'
import {
  BookIcon,
  ExternalIcon,
  GraduationIcon,
  MoonIcon,
  RotateIcon,
  SparklesIcon,
  SunIcon,
} from './components/Icons'

type Mode = 'year' | 'honours'
type Theme = 'light' | 'dark'

const GRADING_SCHEME_URL = 'https://www.gla.ac.uk/media/Media_124293_smxx.pdf'

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

function HonoursSummary({ junior, senior }: { junior: Course[]; senior: Course[] }) {
  const r = computeHonours(junior, senior)
  const ready = junior.some((c) => c.grade) || senior.some((c) => c.grade)

  return (
    <div className="honours-summary">
      <div className="honours-formula">
        <div className="formula-term">
          <span className="formula-label">Junior - 40%</span>
          <span className="formula-value">{ready ? r.juniorGpa.toFixed(1) : '-'}</span>
        </div>
        <span className="formula-op">+</span>
        <div className="formula-term">
          <span className="formula-label">Senior - 60%</span>
          <span className="formula-value">{ready ? r.seniorGpa.toFixed(1) : '-'}</span>
        </div>
        <span className="formula-op">=</span>
        <div className="formula-term formula-term--final">
          <span className="formula-label">Final GPA</span>
          <span className="formula-value">{ready ? r.finalGpa.toFixed(1) : '-'}</span>
        </div>
      </div>
      <div className={`classification${ready ? '' : ' is-empty'}`}>
        <GraduationIcon width={22} height={22} />
        <span>{ready ? r.classification : 'Add grades to see your degree classification'}</span>
      </div>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = usePersistentState<Theme>('gpa.theme', 'light')
  const [mode, setMode] = usePersistentState<Mode>('gpa.mode', 'year')
  const [year, setYear] = usePersistentState<Course[]>('gpa.year', withIds(EXAMPLE_COURSES))
  const [junior, setJunior] = usePersistentState<Course[]>('gpa.junior', [])
  const [senior, setSenior] = usePersistentState<Course[]>('gpa.senior', [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const resetCurrent = () => {
    if (mode === 'year') setYear([])
    else {
      setJunior([])
      setSenior([])
    }
  }

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
          aria-selected={mode === 'honours'}
          className={`tab${mode === 'honours' ? ' is-active' : ''}`}
          onClick={() => setMode('honours')}
        >
          Honours degree
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
            <p className="honours-intro">
              Honours classification combines your two Honours years, Junior Honours weighted{' '}
              <strong>40%</strong> and Senior Honours <strong>60%</strong>.
            </p>
            <div className="honours-grid">
              <section className="panel" aria-label="Junior Honours courses">
                <div className="panel-head">
                  <h2>Junior Honours <span className="weight-chip">40%</span></h2>
                </div>
                <CourseList courses={junior} onChange={setJunior} idPrefix="junior" />
              </section>
              <section className="panel" aria-label="Senior Honours courses">
                <div className="panel-head">
                  <h2>Senior Honours <span className="weight-chip">60%</span></h2>
                </div>
                <CourseList courses={senior} onChange={setSenior} idPrefix="senior" />
              </section>
            </div>
            <section className="panel panel--result">
              <div className="panel-head">
                <h2>Degree classification</h2>
                {(junior.length > 0 || senior.length > 0) && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={resetCurrent}>
                    <RotateIcon width={16} height={16} />
                    Clear
                  </button>
                )}
              </div>
              <HonoursSummary junior={junior} senior={senior} />
            </section>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Grades follow the{' '}
          <a href={GRADING_SCHEME_URL} target="_blank" rel="noreferrer">
            UofG Schedule A
          </a>{' '}
          scale (A1 = 22 down to H = 0). Calculations stay in your browser.
        </p>
      </footer>
    </div>
  )
}
