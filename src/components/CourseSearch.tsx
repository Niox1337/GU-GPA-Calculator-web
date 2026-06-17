import { useState } from "react";
import { CATALOGUE_TREE, COURSE_CATALOGUE } from "../lib/catalogue";
import type { CatalogueCourse } from "../lib/catalogue";
import { CheckIcon, ChevronIcon, CloseIcon, PlusIcon, SearchIcon } from "./Icons";
import StrandTags from "./StrandTags";

interface Props {
  /** Close the picker without adding. */
  onClose: () => void;
  /** Add the ticked catalogue courses, in one batch. */
  onAdd: (courses: CatalogueCourse[]) => void;
  /** Whether a catalogue course is already in the list, so it shows as added. */
  isAdded: (course: CatalogueCourse) => boolean;
  /** Optional restriction on which catalogue courses are searchable. */
  filter?: (course: CatalogueCourse) => boolean;
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

/** Honours (H) or Masters (M) strand from a course name suffix, else null. */
function courseStrand(name: string): "H" | "M" | null {
  if (/\(H\)|\sH$/.test(name)) return "H";
  if (/\(M\)|\sM$/.test(name)) return "M";
  return null;
}

const LEVEL_LABEL: Record<number, string> = {
  1: "Level 1",
  2: "Level 2",
  3: "Level 3",
  4: "Honours",
  5: "Masters",
};

/** Multi-select catalogue picker dialog, shared by every course list. */
export default function CourseSearch({ onClose, onAdd, isAdded, filter }: Props) {
  const [query, setQuery] = useState("");
  const [openSchools, setOpenSchools] = useState<Set<string>>(
    () => new Set(["School of Computing Science"]),
  );
  const [openLevels, setOpenLevels] = useState<Set<string>>(new Set());
  // Catalogue courses ticked in the picker, keyed by their unique code.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(course: CatalogueCourse) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(course.code)) next.delete(course.code);
      else next.add(course.code);
      return next;
    });
  }

  function addSelected() {
    const picked = COURSE_CATALOGUE.filter((c) => selected.has(c.code));
    if (picked.length > 0) onAdd(picked);
    onClose();
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

  // Restrict the searchable set first (e.g. a Computing Science year), then by query.
  const base = filter ? filterTree(CATALOGUE_TREE, filter) : CATALOGUE_TREE;
  const q = query.trim().toLowerCase();
  const tree = q
    ? filterTree(
        base,
        (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
      )
    : base;

  const totalResults = tree.reduce((n, s) => n + s.total, 0);
  const isSchoolOpen = (school: string) => q !== "" || openSchools.has(school);
  const isLevelOpen = (key: string) => q !== "" || openLevels.has(key);
  const selectedCount = selected.size;

  return (
    <div
      className="search-overlay"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
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
          <SearchIcon width={18} height={18} className="search-head__icon" />
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
            onClick={onClose}
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
                            <span className="cat-count">{l.courses.length}</span>
                          </button>

                          {levelOpen && (
                            <ul className="search-results">
                              {l.courses.map((c) => {
                                const added = isAdded(c);
                                const checked = added || selected.has(c.code);
                                return (
                                  <li key={c.code}>
                                    <button
                                      type="button"
                                      className={`search-result${checked ? " is-selected" : ""}`}
                                      role="checkbox"
                                      aria-checked={checked}
                                      disabled={added}
                                      onClick={() => toggleSelect(c)}
                                    >
                                      <span className="search-check" aria-hidden="true">
                                        {checked && <CheckIcon width={14} height={14} />}
                                      </span>
                                      <span className="search-result__name">{c.name}</span>
                                      <span className="search-result__meta">
                                        {courseStrand(c.name) && (
                                          <span
                                            className={`strand-tag strand-tag--${courseStrand(c.name)!.toLowerCase()}`}
                                          >
                                            {courseStrand(c.name)}
                                          </span>
                                        )}
                                        {added && (
                                          <span className="search-result__added">Added</span>
                                        )}
                                        <span className="search-result__credit">
                                          {c.credit} cr
                                        </span>
                                        <span className="search-result__code">{c.code}</span>
                                      </span>
                                      <span className="search-result__strands">
                                        <StrandTags
                                          strands={c.specialisms?.map((s) => s.strand) ?? []}
                                        />
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
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
        <div className="search-foot">
          <span className="search-foot__hint">
            {selectedCount > 0
              ? `${selectedCount} course${selectedCount === 1 ? "" : "s"} selected`
              : "Tick the courses you took, then add them all at once."}
          </span>
          <button
            type="button"
            className="btn btn--primary"
            onClick={addSelected}
            disabled={selectedCount === 0}
          >
            <PlusIcon width={18} height={18} />
            {selectedCount > 0
              ? `Add ${selectedCount} course${selectedCount === 1 ? "" : "s"}`
              : "Add courses"}
          </button>
        </div>
      </div>
    </div>
  );
}
