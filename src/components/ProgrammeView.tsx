import type { Dispatch, SetStateAction } from "react";
import type { ProgrammeYear } from "../lib";
import {
  HONOURS_YEAR_TARGET,
  PRE_HONOURS_YEARS,
  makeComputingScienceProgramme,
  makeDefaultProgramme,
  makeYear,
  yearCreditTotal,
} from "../lib";
import { newId } from "../lib";
import { usePersistentState } from "../hooks/usePersistentState";
import { csYearFilter, courseBaseName, COURSE_CATALOGUE } from "../lib/catalogue";

// MSci research project, auto-added to a Computing Science Year 5.
const MSCI_PROJECT_CODE = "COMPSCI5073P";
// MSci classification weighting by year number.
const MSCI_YEAR_WEIGHTS: Record<number, number> = { 3: 24, 4: 36, 5: 40 };
import CreditMeter from "./CreditMeter";
import DegreeSummary from "./DegreeSummary";
import ProgrammeYearCard from "./ProgrammeYearCard";
import SpecialismProgress from "./SpecialismProgress";
import DegreeRules from "./DegreeRules";
import { PlusIcon, RotateIcon } from "./Icons";

interface Props {
  programme: ProgrammeYear[];
  setProgramme: Dispatch<SetStateAction<ProgrammeYear[]>>;
}

/**
 * Programme builder mode. Each year is a row with one add form that tags courses
 * by semester, shown in a Semester 1 and Semester 2 section. The first two years
 * share a combined 240 credit target, every later year targets 120, and the year
 * weights feed the projected classification (defaulting to a 40 / 60 honours split).
 */
export default function ProgrammeView({ programme, setProgramme }: Props) {
  const [sub, setSub] = usePersistentState<"general" | "cs">("gpa.programmeSub", "general");
  const [csProgramme, setCsProgramme] = usePersistentState<ProgrammeYear[]>(
    "gpa.programmeCS",
    makeComputingScienceProgramme(),
  );

  const isGeneral = sub === "general";
  const active = isGeneral ? programme : csProgramme;
  const setActive = isGeneral ? setProgramme : setCsProgramme;

  const updateYear = (id: string, year: ProgrammeYear) =>
    setActive((prev) => prev.map((y) => (y.id === id ? year : y)));
  const addYear = () =>
    setActive((prev) => {
      const highest = prev.reduce((max, y) => {
        const n = Number(y.name.match(/\d+/)?.[0]);
        return n > max ? n : max;
      }, 0);
      const next = highest + 1;
      const year = makeYear(`Year ${next}`);
      if (!isGeneral && next === 5) {
        const c = COURSE_CATALOGUE.find((x) => x.code === MSCI_PROJECT_CODE);
        if (c) {
          year.courses = [
            { id: newId(), name: c.name, credit: String(c.credit), grade: "", term: c.semester ?? "both" },
          ];
        }
        // MSci classification splits years 3/4/5 as 24/36/40.
        return [...prev, year].map((y) => {
          const w = MSCI_YEAR_WEIGHTS[Number(y.name.match(/\d+/)?.[0])];
          return w != null ? { ...y, weight: w } : y;
        });
      }
      return [...prev, year];
    });
  const removeYear = (id: string) =>
    setActive((prev) => (prev.length > 1 ? prev.filter((y) => y.id !== id) : prev));
  const clearCourses = () =>
    setActive((prev) => prev.map((y) => ({ ...y, courses: [] })));
  const resetProgramme = () =>
    setActive(isGeneral ? makeDefaultProgramme() : makeComputingScienceProgramme());

  const hasData = active.some((y) => y.courses.length > 0);

  // Pre-honours years are the ones numbered 1..PRE_HONOURS_YEARS (by name, not
  // position), so deleting Year 1 leaves Year 2 on its own 120 target.
  const yearNum = (y: ProgrammeYear) => Number(y.name.match(/\d+/)?.[0]) || 0;
  const isPreHonours = (y: ProgrammeYear) => {
    const n = yearNum(y);
    return n >= 1 && n <= PRE_HONOURS_YEARS;
  };
  // Courses taken anywhere in the programme, by variant-agnostic base name, so a
  // course can't be added twice or in both its (H) and (M) forms across years.
  const takenBaseNames = new Set(
    active.flatMap((y) => y.courses).map((c) => courseBaseName(c.name)),
  );

  const preYears = active.filter(isPreHonours);
  const preNums = preYears.map(yearNum).sort((a, b) => a - b);
  const preLabel =
    preNums.length > 1 ? `Years ${preNums[0]}-${preNums[preNums.length - 1]}` : `Year ${preNums[0]}`;

  return (
    <div className="programme-layout">
      <div className="tabs tabs--sub" role="tablist" aria-label="Programme">
        <button
          role="tab"
          aria-selected={isGeneral}
          className={`tab${isGeneral ? " is-active" : ""}`}
          onClick={() => setSub("general")}
        >
          General
        </button>
        <button
          role="tab"
          aria-selected={!isGeneral}
          className={`tab${!isGeneral ? " is-active" : ""}`}
          onClick={() => setSub("cs")}
        >
          Computing Science
        </button>
      </div>

      <p className="honours-intro">
        Build a whole programme year by year. Each year has one add form where you
        choose Semester 1, Semester 2, or both. Years 1 and 2 share a combined 240
        credit target, and every later year targets 120. Year weights feed the
        projected classification and are normalised to their total.
      </p>

      {!isGeneral && (
        <p className="honours-intro programme-note">
          Pre-loaded courses are compulsory. Years 1 and 2 list the mandatory courses for both
          routes, so keep only the ones for your route (standard 1P or alternate 1PX).
        </p>
      )}

      {preYears.length > 0 && (
        <CreditMeter
          label={preLabel}
          planned={preYears.reduce((s, y) => s + yearCreditTotal(y), 0)}
          target={preYears.length * HONOURS_YEAR_TARGET}
        />
      )}

      <div className="year-stack">
        {active.map((year, i) => (
          <ProgrammeYearCard
            key={year.id}
            year={year}
            index={i}
            canRemove={active.length > 1}
            creditTarget={isPreHonours(year) ? null : HONOURS_YEAR_TARGET}
            searchFilter={isGeneral ? undefined : csYearFilter(yearNum(year) || i + 1)}
            searchAutoExpand={!isGeneral && yearNum(year) === 5}
            takenBaseNames={takenBaseNames}
            onChange={(y) => updateYear(year.id, y)}
            onRemove={() => removeYear(year.id)}
          />
        ))}
      </div>

      <div className="programme-actions">
        <button type="button" className="btn btn--ghost" onClick={addYear}>
          <PlusIcon width={18} height={18} />
          Add year
        </button>
        {hasData && (
          <button type="button" className="btn btn--ghost" onClick={clearCourses}>
            <RotateIcon width={16} height={16} />
            Clear courses
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={resetProgramme}>
          <RotateIcon width={16} height={16} />
          Reset years
        </button>
      </div>

      <section className="panel panel--result">
        {!isGeneral && <DegreeRules programme={active} />}
        <div className="panel-head">
          <h2>Projected classification</h2>
        </div>
        <DegreeSummary
          years={active.map((y) => y.courses)}
          weights={active.map((y) => y.weight)}
          labels={active.map((y) => y.name)}
        />
        {!isGeneral && (
          <SpecialismProgress
            pickedNames={
              new Set(active.flatMap((y) => y.courses).map((c) => c.name.toLowerCase()))
            }
          />
        )}
      </section>
    </div>
  );
}
