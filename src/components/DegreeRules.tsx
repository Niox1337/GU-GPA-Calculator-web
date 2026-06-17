import type { ProgrammeYear } from "../lib";
import { checkCsRules, MSCI_PROJECT_NAME, RMT_NAME } from "../lib/catalogue";
import { AlertIcon, CheckIcon } from "./Icons";

const HONOURS_TARGET = 120;
const LEVEL_M_TARGET = 120;
const yearNum = (y: ProgrammeYear) => Number(y.name.match(/\d+/)?.[0]) || 0;
const yearCredits = (y: ProgrammeYear) =>
  y.courses.reduce((s, c) => s + (Number(c.credit) || 0), 0);

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`degree-rule${ok ? " is-ok" : ""}`}>
      {ok ? <CheckIcon width={16} height={16} /> : <AlertIcon width={16} height={16} />}
      <span>{children}</span>
    </li>
  );
}

/**
 * Computing Science graduation rule checks, shown once the honours years (and,
 * for MSci, year 5) are fully planned. Membership and levels are matched by name.
 */
export default function DegreeRules({ programme }: { programme: ProgrammeYear[] }) {
  const byNum = (n: number) => programme.find((y) => yearNum(y) === n);
  const complete = (y?: ProgrammeYear) => !!y && yearCredits(y) >= HONOURS_TARGET;

  const showHonours = complete(byNum(3)) && complete(byNum(4));
  const showMsci = showHonours && complete(byNum(5));
  if (!showHonours) return null;

  const picked = programme
    .flatMap((y) => y.courses)
    .filter((c) => Number(c.credit) > 0)
    .map((c) => ({ name: c.name, credit: Number(c.credit) }));
  const r = checkCsRules(picked);

  return (
    <section className="degree-rules">
      <h3>Graduation requirements</h3>
      <ul>
        <Rule ok={r.hasSecurity}>
          At least one security course (Information Security strand)
        </Rule>
        {showMsci && (
          <>
            <Rule ok={r.hasRmt}>{RMT_NAME} taken</Rule>
            <Rule ok={r.hasProject}>{MSCI_PROJECT_NAME} (80 credits) taken</Rule>
            <Rule ok={r.levelMCredits >= LEVEL_M_TARGET}>
              At least {LEVEL_M_TARGET} credits at level M (currently {r.levelMCredits})
            </Rule>
          </>
        )}
      </ul>
      {showMsci && (
        <p className="degree-rules__note">
          Level M needs the project (80), RMT (10) and 30 credits of optional courses, which can sit
          across levels 3, 4 and 5. One option is Project Research Readings in Computing Science.
        </p>
      )}
    </section>
  );
}
