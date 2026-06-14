import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Course } from "../lib/gpa";
import { GRADES, gradePoint } from "../lib/gpa";
import { COURSE_CATALOGUE } from "../lib/catalogue";
import type { CatalogueCourse } from "../lib/catalogue";
import { CloseIcon, PlusIcon, SearchIcon, TrashIcon } from "./Icons";

interface Props {
  courses: Course[];
  onChange: (courses: Course[]) => void;
  idPrefix: string;
}

const LEVEL_LABEL: Record<number, string> = {
  1: "Level 1",
  2: "Level 2",
  3: "Level 3",
  4: "Honours",
  5: "Masters",
};

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function CourseList({ courses, onChange, idPrefix }: Props) {
  const [name, setName] = useState("");
  const [credit, setCredit] = useState("");
  const [errors, setErrors] = useState<{ name?: string; credit?: string }>({});

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const creditRef = useRef<HTMLInputElement>(null);

  function addCourse(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};

    if (!name.trim()) next.name = "Course name is required";
    if (!credit.trim()) next.credit = "Credits are required";
    else if (!(Number(credit) > 0))
      next.credit = "Credits must be a positive number";

    setErrors(next);
    if (next.name || next.credit) return;

    onChange([
      ...courses,
      { id: newId(), name: name.trim(), credit: credit.trim(), grade: "" },
    ]);
    setName("");
    setCredit("");
    setErrors({});
  }

  // Picking a catalogue course fills the name and its standard credit value.
  // The user can adjust the credits before adding.
  function pickCourse(course: CatalogueCourse) {
    setName(course.name);
    setCredit(String(course.credit));
    setErrors({});
    setSearchOpen(false);
    setQuery("");
    setTimeout(() => creditRef.current?.focus(), 0);
  }

  function update(id: string, patch: Partial<Course>) {
    onChange(courses.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function remove(id: string) {
    onChange(courses.filter((c) => c.id !== id));
  }

  const q = query.trim().toLowerCase();
  const results = (
    q
      ? COURSE_CATALOGUE.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q),
        )
      : COURSE_CATALOGUE
  ).slice(0, 80);

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
            <span
              className="field-error"
              id={`${idPrefix}-name-err`}
              role="alert"
            >
              {errors.name}
            </span>
          )}
        </div>
        <div className="field field--credit">
          <label htmlFor={`${idPrefix}-credit`}>Credits</label>
          <input
            id={`${idPrefix}-credit`}
            ref={creditRef}
            value={credit}
            onChange={(e) => setCredit(e.target.value)}
            inputMode="numeric"
            type="number"
            min="1"
            placeholder="20"
            aria-invalid={!!errors.credit}
            aria-describedby={
              errors.credit ? `${idPrefix}-credit-err` : undefined
            }
          />
          {errors.credit && (
            <span
              className="field-error"
              id={`${idPrefix}-credit-err`}
              role="alert"
            >
              {errors.credit}
            </span>
          )}
        </div>
        <div className="add-actions">
          <button type="submit" className="btn btn--primary">
            <PlusIcon width={18} height={18} />
            Add course
          </button>
          <button
            type="button"
            className="btn btn--success"
            onClick={() => setSearchOpen(true)}
          >
            <SearchIcon width={18} height={18} />
            Search course
          </button>
        </div>
      </form>

      {courses.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No courses yet</p>
          <p className="empty-sub">
            Add your courses above, then pick each Schedule A grade to see your
            GPA update instantly.
          </p>
        </div>
      ) : (
        <ul className="courses">
          {courses.map((c) => {
            // A course only contributes once the user selects a grade.
            const counted = !!c.grade;

            return (
              <li
                className={`course-card${counted ? " is-counted" : ""}`}
                key={c.id}
              >
                <div className="course-main">
                  <span className="course-name" title={c.name}>
                    {c.name}
                  </span>
                  <span className="course-credit">{c.credit} credits</span>
                </div>
                <div className="course-grade">
                  <label
                    className="sr-only"
                    htmlFor={`${idPrefix}-grade-${c.id}`}
                  >
                    Grade for {c.name}
                  </label>
                  <select
                    id={`${idPrefix}-grade-${c.id}`}
                    value={c.grade}
                    onChange={(e) => update(c.id, { grade: e.target.value })}
                    className={counted ? "has-value" : ""}
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
            );
          })}
        </ul>
      )}

      {searchOpen && (
        <div
          className="search-overlay"
          role="presentation"
          onClick={() => setSearchOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSearchOpen(false);
          }}
        >
          <div
            className="search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Search the course catalogue"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="search-head">
              <SearchIcon
                width={18}
                height={18}
                className="search-head__icon"
              />
              <input
                autoFocus
                className="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Computing Science courses..."
                aria-label="Search courses by name or code"
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
              >
                <CloseIcon width={18} height={18} />
              </button>
            </div>

            <p className="search-meta">
              University of Glasgow course catalogue · {results.length}
              {results.length === 80 ? "+" : ""} result
              {results.length === 1 ? "" : "s"}
            </p>

            {results.length === 0 ? (
              <div className="search-empty">No courses match "{query}".</div>
            ) : (
              <ul className="search-results">
                {results.map((c) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      className="search-result"
                      onClick={() => pickCourse(c)}
                    >
                      <span className="search-result__name">{c.name}</span>
                      <span className="search-result__meta">
                        <span className="search-result__level">
                          {LEVEL_LABEL[c.level]}
                        </span>
                        <span className="search-result__credit">
                          {c.credit} cr
                        </span>
                        <span className="search-result__code">{c.code}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="search-foot">
              Adjust credits after picking if your course differs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
