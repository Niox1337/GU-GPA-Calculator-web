import type { Course } from '../lib'
import { EXAMPLE_COURSES, withIds } from '../lib'
import CourseList from './CourseList'
import ResultCard from './ResultCard'
import { RotateIcon, SparklesIcon } from './Icons'

/** Single-year mode: enter one year's courses and see its GPA and breakdown. */
export default function YearView({
  courses,
  onChange,
}: {
  courses: Course[]
  onChange: (courses: Course[]) => void
}) {
  return (
    <div className="layout">
      <section className="panel" aria-label="Courses">
        <div className="panel-head">
          <h2>Your courses</h2>
          <div className="panel-tools">
            {courses.length === 0 && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => onChange(withIds(EXAMPLE_COURSES))}
              >
                <SparklesIcon width={16} height={16} />
                Load example
              </button>
            )}
            {courses.length > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange([])}>
                <RotateIcon width={16} height={16} />
                Clear
              </button>
            )}
          </div>
        </div>
        <CourseList courses={courses} onChange={onChange} idPrefix="year" />
      </section>
      <aside className="panel panel--result">
        <ResultCard courses={courses} />
      </aside>
    </div>
  )
}
