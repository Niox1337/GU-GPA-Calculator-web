import type { ReactNode } from "react";
import type { Course, CsDegree, ProgressionTarget } from "../lib";
import { checkProgression } from "../lib";
import CourseList from "./CourseList";
import {
  AlertIcon,
  CheckIcon,
  CloseIcon,
  ExternalIcon,
  GraduationIcon,
  RotateIcon,
} from "./Icons";

interface Props {
  target: ProgressionTarget;
  onTargetChange: (t: ProgressionTarget) => void;
  csDegree: CsDegree;
  onCsDegreeChange: (d: CsDegree) => void;
  courses: Course[];
  onChange: (courses: Course[]) => void;
  /** Copy the Computing Honours courses and grades into the BSc Honours tab. */
  onTransferToBsc: () => void;
}

const TARGETS: { value: ProgressionTarget; tab: string }[] = [
  { value: "l1", tab: "Level 1 → 2" },
  { value: "l2", tab: "Level 2 → 3" },
  { value: "bsc", tab: "BSc Honours" },
  { value: "msci", tab: "MSci entry" },
  { value: "cs-honours", tab: "Computing Honours" },
  { value: "l3", tab: "Level 3 → 4" },
  { value: "l4", tab: "Level 4 → 5" },
];

// School of Computing Science Level 3 entry programmes (page 24 of the briefing).
const CS_DEGREES: { value: CsDegree; label: string }[] = [
  { value: "csh", label: "CSH/M, SEH/M, SEYPM" },
  { value: "eseh", label: "ESEH" },
  { value: "combined", label: "Combined (CSH/M+)" },
  { value: "designated", label: "Designated (CS, CS+)" },
];

const INTRO: Record<ProgressionTarget, string> = {
  l1: "Minimum requirements to progress from Level 1 to Level 2 (regulation §3.1). Add your Level 1 courses and grades to check each rule.",
  l2: "Within-level requirements to progress from Level 2 to Level 3 (regulation §3.1). Add this session’s Level 2 courses and grades.",
  bsc: "Admission to a BSc Honours programme (Generic Undergraduate Regulation §15.1). Add every Level 1 and Level 2 course taken so far, with grades.",
  msci: "Admission to an MSci programme. Add every Level 1 and Level 2 course taken so far, with grades.",
  "cs-honours":
    "School of Computing Science entry to Level 3. Pick your programme, then add your Level 2 computing courses at first attempt. The 6 Level 2 computing courses are ADS2, AF2, IOOP2, NOSE2, OOSE2 and WAD2 (CS1F and CS1S do not count).",
  l3: "Progression from Level 3 to Level 4. Add your Level 3 courses and grades. BSc needs a Level 3 GPA of 9.0 and MSci needs 12.0.",
  l4: "Progression from Level 4 to Level 5, for MSci students. Add your Level 4 courses and grades. MSci needs a Level 4 GPA of 12.0.",
};

// BSc/MSci progression regulations 2025-26 (source of the rules).
const REG_URL =
  "https://www.gla.ac.uk/myglasgow/apg/policies/uniregs/regulations2025-26/scieng/bscmsci/";

// Per-target caveat. Each completes the sentence "this ...", and flags the
// extra requirements the single course list cannot check automatically.
const NOTE: Record<ProgressionTarget, ReactNode> = {
  l1: <>checks the Level 1 to 2 minimum progression rule (§3.1).</>,
  l2: (
    <>
      checks the within-level §3.1 rule. Progression also needs the cumulative
      total of at least 160 credits, a GPA of 8.0 over the best 160 credits, and
      120 credits at D3 or above.
    </>
  ),
  bsc: (
    <>
      checks the §15.1 credit, GPA and D3 thresholds (resits allowed). Honours
      entry also needs at least 140 credits from recognised courses and the
      School entry rule on the Computing Honours tab.
    </>
  ),
  msci: (
    <>
      checks the 240-credit GPA 12.0 and 200-credit D3 thresholds. MSci entry
      also needs at least 140 Science credits at GPA 12.0 and at least 60 Level 2
      or above Science credits at GPA 15.0.
    </>
  ),
  "cs-honours": (
    <>
      checks the School of Computing Science entry rule only. Entry to Level 3
      also needs the College §15.1 requirements on the BSc Honours or MSci tab.
    </>
  ),
  l3: (
    <>
      checks the Level 3 GPA. A GPA below 9.0 means switching to a designated
      degree, and MSci students with a GPA of 9.0 to 11.9 switch to a BSc
      programme.
    </>
  ),
  l4: (
    <>
      checks the Level 4 GPA. MSci students with a GPA of 9.0 to 11.9 switch to a
      BSc programme and graduate at Level 4.
    </>
  ),
};

export default function ProgressionCheck({
  target,
  onTargetChange,
  csDegree,
  onCsDegreeChange,
  courses,
  onChange,
  onTransferToBsc,
}: Props) {
  const result = checkProgression(target, courses, csDegree);
  const csHonours = target === "cs-honours";

  return (
    <div className="honours-layout">
      <div
        className="degree-switch degree-switch--wrap"
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

      {csHonours && (
        <label className="programme-field">
          <span>Programme</span>
          <select
            value={csDegree}
            onChange={(e) => onCsDegreeChange(e.target.value as CsDegree)}
            aria-label="Computing Science programme"
          >
            {CS_DEGREES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="layout">
        <section className="panel" aria-label="Courses">
          <div className="panel-head">
            <h2>Your courses</h2>
            {!csHonours && courses.length > 0 && (
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
            fixed={csHonours}
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
              <strong>Heads up:</strong> this {NOTE[target]} It excludes resit and
              degree-specific rules, so always confirm with your adviser of
              studies. See the{" "}
              <a href={REG_URL} target="_blank" rel="noreferrer">
                BSc and MSci progression regulations
              </a>
              .
            </p>

            {csHonours && (
              <button
                type="button"
                className="btn btn--ghost btn--block"
                onClick={onTransferToBsc}
              >
                <ExternalIcon width={16} height={16} />
                Copy these courses to BSc Honours
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
