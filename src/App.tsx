import { useRef } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'
import uogLogo from './assets/UoG.svg'
import type { Course, JointSubject, ProgrammeYear } from './lib'
import { EXAMPLE_COURSES, makeDefaultProgramme, withIds } from './lib'
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
import { usePersistentState } from './hooks/usePersistentState'
import { useTheme } from './hooks/useTheme'
import { useToast } from './hooks/useToast'
import YearView from './components/YearView'
import DegreeView from './components/DegreeView'
import ProgrammeView from './components/ProgrammeView'
import ProgressionView from './components/ProgressionView'
import {
  AlertIcon,
  BookIcon,
  CheckIcon,
  DownloadIcon,
  ExternalIcon,
  GithubIcon,
  MoonIcon,
  StarIcon,
  SunIcon,
  UploadIcon,
} from './components/Icons'

type Mode = 'year' | 'degree' | 'programme' | 'progression'

const GRADING_SCHEME_URL = 'https://www.gla.ac.uk/media/Media_124293_smxx.pdf'
const REPO_URL = 'https://github.com/Niox1337/GU-GPA-Calculator-web'

export default function App() {
  const { theme, toggle } = useTheme()
  const { toast, setToast } = useToast()
  const [mode, setMode] = usePersistentState<Mode>('gpa.mode', 'year')

  // Course data that is part of the import/export bundle lives here, the app shell.
  const [year, setYear] = usePersistentState<Course[]>('gpa.year', withIds(EXAMPLE_COURSES))
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
  const [programme, setProgramme] = usePersistentState<ProgrammeYear[]>(
    'gpa.programmeYears',
    makeDefaultProgramme(),
  )

  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentBundle = (): DataBundle => ({
    year,
    honoursYears,
    honoursWeights,
    jointSubjects,
    jointSubjectWeights,
    imYears,
    imWeights,
    programme,
  })

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
      setProgramme(bundle.programme)
      const count = bundleCount(bundle)
      setToast({ kind: 'success', msg: `Imported ${count} course${count === 1 ? '' : 's'}.` })
    } catch (err) {
      setToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Could not import that file.' })
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
            onClick={toggle}
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
          aria-selected={mode === 'degree'}
          className={`tab${mode === 'degree' ? ' is-active' : ''}`}
          onClick={() => setMode('degree')}
        >
          Degree classification
        </button>
        <button
          role="tab"
          aria-selected={mode === 'programme'}
          className={`tab${mode === 'programme' ? ' is-active' : ''}`}
          onClick={() => setMode('programme')}
        >
          Programme
        </button>
        <button
          role="tab"
          aria-selected={mode === 'progression'}
          className={`tab${mode === 'progression' ? ' is-active' : ''}`}
          onClick={() => setMode('progression')}
        >
          Progression
        </button>
      </div>

      <main className="app-main">
        {mode === 'year' ? (
          <YearView courses={year} onChange={setYear} />
        ) : mode === 'programme' ? (
          <ProgrammeView programme={programme} setProgramme={setProgramme} />
        ) : mode === 'progression' ? (
          <ProgressionView />
        ) : (
          <DegreeView
            honoursYears={honoursYears}
            setHonoursYears={setHonoursYears}
            honoursWeights={honoursWeights}
            setHonoursWeights={setHonoursWeights}
            imYears={imYears}
            setImYears={setImYears}
            imWeights={imWeights}
            setImWeights={setImWeights}
            jointSubjects={jointSubjects}
            setJointSubjects={setJointSubjects}
            jointSubjectWeights={jointSubjectWeights}
            setJointSubjectWeights={setJointSubjectWeights}
          />
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
