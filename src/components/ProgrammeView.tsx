import type { Dispatch, SetStateAction } from "react";
import type { ProgrammeYear } from "../lib";
import {
  HONOURS_YEAR_TARGET,
  PRE_HONOURS_TARGET,
  PRE_HONOURS_YEARS,
  makeComputingScienceProgramme,
  makeDefaultProgramme,
  makeYear,
  preHonoursCredits,
} from "../lib";
import { usePersistentState } from "../hooks/usePersistentState";
import CreditMeter from "./CreditMeter";
import DegreeSummary from "./DegreeSummary";
import ProgrammeYearCard from "./ProgrammeYearCard";
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
  const addYear = () => setActive((prev) => [...prev, makeYear(`Year ${prev.length + 1}`)]);
  const removeYear = (id: string) =>
    setActive((prev) => (prev.length > 1 ? prev.filter((y) => y.id !== id) : prev));
  const clearCourses = () =>
    setActive((prev) => prev.map((y) => ({ ...y, courses: [] })));
  const resetProgramme = () =>
    setActive(isGeneral ? makeDefaultProgramme() : makeComputingScienceProgramme());

  const hasData = active.some((y) => y.courses.length > 0);
  const preHonoursSpan = Math.min(PRE_HONOURS_YEARS, active.length);

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

      {active.length > 0 && (
        <CreditMeter
          label={preHonoursSpan > 1 ? `Years 1-${preHonoursSpan}` : "Year 1"}
          planned={preHonoursCredits(active)}
          target={PRE_HONOURS_TARGET}
        />
      )}

      <div className="year-stack">
        {active.map((year, i) => (
          <ProgrammeYearCard
            key={year.id}
            year={year}
            index={i}
            canRemove={active.length > 1}
            creditTarget={i >= PRE_HONOURS_YEARS ? HONOURS_YEAR_TARGET : null}
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
        <div className="panel-head">
          <h2>Projected classification</h2>
        </div>
        <DegreeSummary
          years={active.map((y) => y.courses)}
          weights={active.map((y) => y.weight)}
          labels={active.map((y) => y.name)}
        />
      </section>
    </div>
  );
}
