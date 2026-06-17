import { useState } from "react";
import type { FormEvent } from "react";
import type { Course } from "../lib";
import { GRADES, gradePoint } from "../lib";
import type { CatalogueCourse } from "../lib/catalogue";
import CourseSearch from "./CourseSearch";
import { PlusIcon, SearchIcon, TrashIcon } from "./Icons";

interface Props {
  courses: Course[];
  onChange: (courses: Course[]) => void;
  idPrefix: string;
  /** Fixed list: hide the add form, search, and remove buttons; grades only. */
  fixed?: boolean;
}

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function CourseList({
  courses,
  onChange,
  idPrefix,
  fixed = false,
}: Props) {
  const [name, setName] = useState("");
  const [credit, setCredit] = useState("");
  const [errors, setErrors] = useState<{ name?: string; credit?: string }>({});
  const [searchOpen, setSearchOpen] = useState(false);

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

  // Picked catalogue courses join the list, keeping their standard credit value.
  function addFromCatalogue(picked: CatalogueCourse[]) {
    onChange([
      ...courses,
      ...picked.map((c) => ({
        id: newId(),
        name: c.name,
        credit: String(c.credit),
        grade: "",
      })),
    ]);
  }

  function update(id: string, patch: Partial<Course>) {
    onChange(courses.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function remove(id: string) {
    onChange(courses.filter((c) => c.id !== id));
  }

  // Courses already in the list, matched by name so the picker can mark them.
  const addedNames = new Set(courses.map((c) => c.name.toLowerCase()));

  return (
    <div className="course-list">
      {!fixed && (
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
          <div className="add-actions">
            <button type="submit" className="btn btn--primary">
              <PlusIcon width={18} height={18} />
              Add
            </button>
            <button
              type="button"
              className="btn btn--success"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon width={18} height={18} />
              Search
            </button>
          </div>
        </form>
      )}

      {courses.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No courses yet</p>
          <p className="empty-sub">
            Add your courses above, then pick each Schedule A grade to see your GPA
            update instantly.
          </p>
        </div>
      ) : (
        <ul className="courses">
          {courses.map((c) => {
            // A course only contributes once the user selects a grade.
            const counted = !!c.grade;

            return (
              <li className={`course-card${counted ? " is-counted" : ""}`} key={c.id}>
                <div className="course-main">
                  <span className="course-name">{c.name}</span>
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
                    className={counted ? "has-value" : ""}
                  >
                    <option value="">Not taken</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g} - {gradePoint(g)} pts
                      </option>
                    ))}
                  </select>
                  {!fixed && (
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      onClick={() => remove(c.id)}
                      aria-label={`Remove ${c.name}`}
                      title={`Remove ${c.name}`}
                    >
                      <TrashIcon width={18} height={18} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {searchOpen && (
        <CourseSearch
          onClose={() => setSearchOpen(false)}
          onAdd={addFromCatalogue}
          isAdded={(c) => addedNames.has(c.name.toLowerCase())}
        />
      )}
    </div>
  );
}
