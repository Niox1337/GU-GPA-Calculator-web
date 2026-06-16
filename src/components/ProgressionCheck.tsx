import type { Course, ProgressionTarget } from "../lib/gpa";
import { checkProgression } from "../lib/gpa";
import type { CatalogueCourse } from "../lib/catalogue";
import CourseList from "./CourseList";
import {
  AlertIcon,
  CheckIcon,
  CloseIcon,
  GraduationIcon,
  RotateIcon,
} from "./Icons";

interface Props {
  target: ProgressionTarget;
  onTargetChange: (t: ProgressionTarget) => void;
  courses: Course[];
  onChange: (courses: Course[]) => void;
}

const TARGETS: { value: ProgressionTarget; tab: string }[] = [
  { value: "l1", tab: "Level 1 → 2" },
  { value: "l2", tab: "Level 2 → 3" },
  { value: "cs-honours", tab: "Computing Honours" },
];

const INTRO: Record<ProgressionTarget, string> = {
  l1: "Minimum requirements to progress from Level 1 to Level 2. Add your Level 1 courses and grades to check each rule.",
  l2: "Minimum requirements to progress from Level 2 to Level 3, assessed within the session. Add this session’s Level 2 courses and grades.",
  "cs-honours":
    "School of Computing Science Honours. Add your 60 credits of Level 2 computing courses at first attempt. Also needs the Level 2 -> 3 science requirements.",
};

// College of Science & Engineering progression requirements (source of the rules).
const SPC_URL =
  "https://www.gla.ac.uk/colleges/scienceengineering/students/scienceprogresscommitteecose-spc/#progressionwithinundergraduatedegrees,minimumprogressionrequirements";

// Computing Honours entry is assessed only on Level 2 School of Computing
// Science courses, so the picker is locked to that slice of the catalogue.
const CS_L2_FILTER = (c: CatalogueCourse) =>
  c.school === "School of Computing Science" && c.level === 2;

export default function ProgressionCheck({
  target,
  onTargetChange,
  courses,
  onChange,
}: Props) {
  const result = checkProgression(target, courses);
  const csHonours = target === "cs-honours";

  return (
    <div className="honours-layout">
      <div
        className="degree-switch"
        role="tablist"
        aria-label="Progression target"
      >
        {TARGETS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={target === t.value}
            className={`seg${target === t.value ? " is-active" : ""}`}
            onClick={() => onTargetChange(t.value)}
          >
            {t.tab}
          </button>
        ))}
      </div>

      <p className="honours-intro">{INTRO[target]}</p>

      <div className="layout">
        <section className="panel" aria-label="Courses">
          <div className="panel-head">
            <h2>Your courses</h2>
            {courses.length > 0 && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => onChange([])}
              >
                <RotateIcon width={16} height={16} />
                Clear
              </button>
            )}
          </div>
          <CourseList
            courses={courses}
            onChange={onChange}
            idPrefix="progress"
            catalogueOnly={csHonours}
            catalogueFilter={csHonours ? CS_L2_FILTER : undefined}
            pickLabel="Add a Level 2 computing course"
            pickHint="Only Level 2 School of Computing Science courses count toward Honours entry."
          />
        </section>

        <aside className="panel panel--result">
          <div className="progress-result" aria-live="polite">
            {!result.ready ? (
              <div className="classification is-empty">
                <GraduationIcon width={22} height={22} />
                <span>Add grades to check your progression</span>
              </div>
            ) : (
              <div
                className={`progress-verdict ${result.met ? "is-pass" : "is-fail"}`}
              >
                {result.met ? (
                  <CheckIcon width={24} height={24} />
                ) : (
                  <AlertIcon width={24} height={24} />
                )}
                <span>
                  {result.met ? "Eligible to progress" : "Not yet eligible"}
                </span>
              </div>
            )}

            <ul className="req-list">
              {result.requirements.map((r) => {
                const state = !result.ready
                  ? "is-idle"
                  : r.met
                    ? "is-met"
                    : "is-unmet";
                return (
                  <li key={r.label} className={`req ${state}`}>
                    <span className="req-icon" aria-hidden="true">
                      {result.ready && r.met ? (
                        <CheckIcon width={16} height={16} />
                      ) : result.ready ? (
                        <CloseIcon width={16} height={16} />
                      ) : null}
                    </span>
                    <span className="req-text">
                      <span className="req-label">{r.label}</span>
                      {result.ready && (
                        <span className="req-detail">{r.detail}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="border-note">
              {csHonours ? (
                <>
                  <strong>Heads up:</strong> this checks the School of Computing
                  Science Honours entry rule only. Full admission also needs the{" "}
                  <a href={SPC_URL} target="_blank" rel="noreferrer">
                    Level 2 to 3 science progression requirements
                  </a>{" "}
                  and excludes resit and degree-specific rules. Always confirm
                  with your adviser of studies.
                </>
              ) : (
                <>
                  <strong>Heads up:</strong> these are the College of Science
                  &amp; Engineering{" "}
                  <a href={SPC_URL} target="_blank" rel="noreferrer">
                    minimum progression requirements
                  </a>{" "}
                  and do not include cumulative-credit, degree-specific, or
                  reassessment rules. Always confirm with your adviser of
                  studies.
                </>
              )}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
