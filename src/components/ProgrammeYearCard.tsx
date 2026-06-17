import { useState } from "react";
import type { ProgrammeYear, Term, YearCourse } from "../lib";
import { GRADES, computeYear, coursesInTerm, gradePoint, yearCreditTotal } from "../lib";
import type { CatalogueCourse } from "../lib/catalogue";
import { STRANDS_BY_NAME } from "../lib/catalogue";
import CourseSearch from "./CourseSearch";
import StrandTags from "./StrandTags";
import CreditMeter from "./CreditMeter";
import { SearchIcon, TrashIcon } from "./Icons";

interface Props {
  year: ProgrammeYear;
  onChange: (year: ProgrammeYear) => void;
  onRemove: () => void;
  canRemove: boolean;
  index: number;
  /** Per-year credit target, or null when the combined pre-honours meter covers it. */
  creditTarget: number | null;
  /** Optional restriction on which catalogue courses the search offers. */
  searchFilter?: (course: CatalogueCourse) => boolean;
}

const SEMESTERS: { key: "s1" | "s2"; label: string; short: string }[] = [
  { key: "s1", label: "Semester 1", short: "S1" },
  { key: "s2", label: "Semester 2", short: "S2" },
];

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/**
 * One programme year: a single add form whose Semester selector tags each course
 * S1, S2, or both, and two semester sections that display them. A "both" course
 * is one shared record shown in both sections, edited and removed once.
 */
export default function ProgrammeYearCard({
  year,
  onChange,
  onRemove,
  canRemove,
  index,
  creditTarget,
  searchFilter,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);

  const setCourses = (courses: YearCourse[]) => onChange({ ...year, courses });

  function addFromCatalogue(picked: CatalogueCourse[]) {
    setCourses([
      ...year.courses,
      ...picked.map((c) => ({
        id: newId(),
        name: c.name,
        credit: String(c.credit),
        grade: "",
        term: (c.semester ?? "both") as Term,
      })),
    ]);
  }

  const updateCourse = (id: string, patch: Partial<YearCourse>) =>
    setCourses(year.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeCourse = (id: string) => setCourses(year.courses.filter((c) => c.id !== id));

  const result = computeYear(year.courses);
  const ready = result.countedCount > 0;
  const addedNames = new Set(year.courses.map((c) => c.name.toLowerCase()));

  return (
    <section className="panel year-row" aria-label={`${year.name} courses`}>
      <div className="panel-head year-head">
        <input
          className="subject-name"
          value={year.name}
          onChange={(e) => onChange({ ...year, name: e.target.value })}
          aria-label={`Year ${index + 1} name`}
        />
        <div className="year-head__meta">
          <span className="year-gpa">{ready ? `GPA ${result.gpa1dp.toFixed(1)}` : "no grades yet"}</span>
          <label className="weight-field" title="Year weighting for the classification">
            <input
              type="number"
              min="0"
              max="100"
              inputMode="numeric"
              value={year.weight}
              onChange={(e) => onChange({ ...year, weight: Number(e.target.value) || 0 })}
              aria-label={`${year.name} weight, percent`}
            />
            <span>%</span>
          </label>
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label={`Remove ${year.name}`}
            title={`Remove ${year.name}`}
          >
            <TrashIcon width={18} height={18} />
          </button>
        </div>
      </div>

      {creditTarget != null && (
        <CreditMeter label={year.name} planned={yearCreditTotal(year)} target={creditTarget} />
      )}

      <div className="course-list">
        <div className="add-actions">
          <button type="button" className="btn btn--success" onClick={() => setSearchOpen(true)}>
            <SearchIcon width={18} height={18} />
            Search
          </button>
        </div>

        <div className="semesters">
          {SEMESTERS.map((sem) => {
            const list = coursesInTerm(year, sem.key);
            return (
              <div className="semester" key={sem.key}>
                <h3 className="semester-head">
                  {sem.label}
                  <span className="semester-count">{list.length}</span>
                </h3>
                {list.length === 0 ? (
                  <p className="semester-empty">No {sem.label} courses yet.</p>
                ) : (
                  <ul className="courses">
                    {list.map((c) => {
                      const counted = !!c.grade;
                      return (
                        <li className={`course-card${counted ? " is-counted" : ""}`} key={c.id}>
                          <div className="course-main">
                            <span className="course-name">
                              {c.name}
                              {c.term === "both" && <span className="course-term-tag">Both</span>}
                              <StrandTags strands={STRANDS_BY_NAME.get(c.name.toLowerCase()) ?? []} />
                            </span>
                            <span className="course-credit">{c.credit} credits</span>
                          </div>
                          <div className="course-grade">
                            <label className="sr-only" htmlFor={`py-${year.id}-${sem.key}-grade-${c.id}`}>
                              Grade for {c.name}
                            </label>
                            <select
                              id={`py-${year.id}-${sem.key}-grade-${c.id}`}
                              value={c.grade}
                              onChange={(e) => updateCourse(c.id, { grade: e.target.value })}
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
                              onClick={() => removeCourse(c.id)}
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
              </div>
            );
          })}
        </div>

        {searchOpen && (
          <CourseSearch
            onClose={() => setSearchOpen(false)}
            onAdd={addFromCatalogue}
            isAdded={(c) => addedNames.has(c.name.toLowerCase())}
            filter={searchFilter}
          />
        )}
      </div>
    </section>
  );
}
