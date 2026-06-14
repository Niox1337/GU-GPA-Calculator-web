import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Course } from '../lib/gpa'
import { GRADES, gradePoint } from '../lib/gpa'
import { PlusIcon, TrashIcon } from './Icons'

interface Props {
  courses: Course[]
  onChange: (courses: Course[]) => void
  idPrefix: string
}

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

export default function CourseList({ courses, onChange, idPrefix }: Props) {
  const [name, setName] = useState('')
  const [credit, setCredit] = useState('')
  const [errors, setErrors] = useState<{ name?: string; credit?: string }>({})

  function addCourse(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}

    if (!name.trim()) next.name = 'Course name is required'
    if (!credit.trim()) next.credit = 'Credits are required'
    else if (!(Number(credit) > 0)) next.credit = 'Credits must be a positive number'

    setErrors(next)
    if (next.name || next.credit) return

    onChange([...courses, { id: newId(), name: name.trim(), credit: credit.trim(), grade: '' }])
    setName('')
    setCredit('')
    setErrors({})
  }

  function update(id: string, patch: Partial<Course>) {
    onChange(courses.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function remove(id: string) {
    onChange(courses.filter((c) => c.id !== id))
  }

  return (
    <div className="course-list">
      <form className="add-form" onSubmit={addCourse} noValidate>
        <div className="field">
          <label htmlFor={`${idPrefix}-name`}>Course name</label>
          <input
            id={`${idPrefix}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Computing Science"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${idPrefix}-name-err` : undefined}
          />
          {errors.name && (
            <span className="field-error" id={`${idPrefix}-name-err`} role="alert">
              {errors.name}
            </span>
          )}
        </div>
        <div className="field field--credit">
          <label htmlFor={`${idPrefix}-credit`}>Credits</label>
          <input
            id={`${idPrefix}-credit`}
            value={credit}
            onChange={(e) => setCredit(e.target.value)}
            inputMode="numeric"
            type="number"
            min="1"
            placeholder="20"
            aria-invalid={!!errors.credit}
            aria-describedby={errors.credit ? `${idPrefix}-credit-err` : undefined}
          />
          {errors.credit && (
            <span className="field-error" id={`${idPrefix}-credit-err`} role="alert">
              {errors.credit}
            </span>
          )}
        </div>
        <button type="submit" className="btn btn--primary add-btn">
          <PlusIcon width={18} height={18} />
          Add course
        </button>
      </form>

      {courses.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No courses yet</p>
          <p className="empty-sub">
            Add your courses above, then pick each Schedule A grade to see your GPA update
            instantly.
          </p>
        </div>
      ) : (
        <ul className="courses">
          {courses.map((c) => {
            // A course only contributes once the user selects a grade.
            const counted = !!c.grade

            return (
              <li className={`course-card${counted ? ' is-counted' : ''}`} key={c.id}>
                <div className="course-main">
                  <span className="course-name" title={c.name}>
                    {c.name}
                  </span>
                  <span className="course-credit">{c.credit} credits</span>
                </div>
                <div className="course-grade">
                  <label className="sr-only" htmlFor={`${idPrefix}-grade-${c.id}`}>
                    Grade for {c.name}
                  </label>
                  <select
                    id={`${idPrefix}-grade-${c.id}`}
                    value={c.grade}
                    onChange={(e) => update(c.id, { grade: e.target.value })}
                    className={counted ? 'has-value' : ''}
                  >
                    <option value="">Not taken</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g} - {gradePoint(g)} pts
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    onClick={() => remove(c.id)}
                    aria-label={`Remove ${c.name}`}
                    title={`Remove ${c.name}`}
                  >
                    <TrashIcon width={18} height={18} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
