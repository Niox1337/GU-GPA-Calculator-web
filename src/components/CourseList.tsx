import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Course } from "../lib";
import { GRADES, gradePoint } from "../lib";
import { CATALOGUE_TREE } from "../lib/catalogue";
import type { CatalogueCourse } from "../lib/catalogue";
import {
  ChevronIcon,
  CloseIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "./Icons";

interface Props {
  courses: Course[];
  onChange: (courses: Course[]) => void;
  idPrefix: string;
  /** Fixed list: hide the add form, search, and remove buttons; grades only. */
  fixed?: boolean;
}

type Tree = typeof CATALOGUE_TREE;

/** Filter the catalogue tree by a course predicate, dropping empty levels and schools. */
function filterTree(tree: Tree, pred: (c: CatalogueCourse) => boolean): Tree {
  return tree
    .map((s) => {
      const levels = s.levels
        .map((l) => ({ ...l, courses: l.courses.filter(pred) }))
        .filter((l) => l.courses.length > 0);
      return { ...s, levels, total: levels.reduce((n, l) => n + l.courses.length, 0) };
    })
    .filter((s) => s.total > 0);
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
  const [query, setQuery] = useState("");
  const [openSchools, setOpenSchools] = useState<Set<string>>(new Set());
  const [openLevels, setOpenLevels] = useState<Set<string>>(new Set());
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

  function toggleSchool(school: string) {
    setOpenSchools((prev) => {
      const next = new Set(prev);
      if (next.has(school)) next.delete(school);
      else next.add(school);
      return next;
    });
  }

  function toggleLevel(key: string) {
    setOpenLevels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Filter by course name or code. An active query auto-expands matching groups.
  const q = query.trim().toLowerCase();
  const tree = q
    ? filterTree(
        CATALOGUE_TREE,
        (c) =>
          c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
      )
    : CATALOGUE_TREE;

  const totalResults = tree.reduce((n, s) => n + s.total, 0);
  const isSchoolOpen = (school: string) => q !== "" || openSchools.has(school);
  const isLevelOpen = (key: string) => q !== "" || openLevels.has(key);

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
                placeholder="Search courses by name or code..."
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
              University of Glasgow course catalogue · {totalResults} course
              {totalResults === 1 ? "" : "s"}
            </p>

            {tree.length === 0 ? (
              <div className="search-empty">No courses match "{query}".</div>
            ) : (
              <div className="catalogue-tree">
                {tree.map((s) => {
                  const schoolOpen = isSchoolOpen(s.school);
                  return (
                    <div className="cat-school" key={s.school}>
                      <button
                        type="button"
                        className="cat-head cat-head--school"
                        aria-expanded={schoolOpen}
                        onClick={() => toggleSchool(s.school)}
                      >
                        <ChevronIcon
                          width={16}
                          height={16}
                          className={`cat-chevron${schoolOpen ? " is-open" : ""}`}
                        />
                        <span className="cat-head__name">{s.school}</span>
                        <span className="cat-count">{s.total}</span>
                      </button>

                      {schoolOpen &&
                        s.levels.map((l) => {
                          const key = `${s.school}::${l.level}`;
                          const levelOpen = isLevelOpen(key);
                          return (
                            <div className="cat-level" key={key}>
                              <button
                                type="button"
                                className="cat-head cat-head--level"
                                aria-expanded={levelOpen}
                                onClick={() => toggleLevel(key)}
                              >
                                <ChevronIcon
                                  width={15}
                                  height={15}
                                  className={`cat-chevron${levelOpen ? " is-open" : ""}`}
                                />
                                <span className="cat-head__name">
                                  {LEVEL_LABEL[l.level] ?? `Level ${l.level}`}
                                </span>
                                <span className="cat-count">
                                  {l.courses.length}
                                </span>
                              </button>

                              {levelOpen && (
                                <ul className="search-results">
                                  {l.courses.map((c) => (
                                    <li key={c.code}>
                                      <button
                                        type="button"
                                        className="search-result"
                                        onClick={() => pickCourse(c)}
                                      >
                                        <span className="search-result__name">
                                          {c.name}
                                        </span>
                                        <span className="search-result__meta">
                                          <span className="search-result__credit">
                                            {c.credit} cr
                                          </span>
                                          <span className="search-result__code">
                                            {c.code}
                                          </span>
                                        </span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
              </div>
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
