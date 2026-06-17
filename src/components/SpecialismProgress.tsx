import { SPECIALISM_STRANDS, strandProgress } from "../lib/catalogue";
import { CheckIcon } from "./Icons";

/**
 * Computing Science specialism tracker: one small card per strand showing how
 * many optional courses are picked against the handbook minimum, plus whether
 * each compulsory course is selected. Membership is matched by course name.
 */
export default function SpecialismProgress({ pickedNames }: { pickedNames: Set<string> }) {
  const rows = strandProgress(pickedNames);
  return (
    <div className="strand-progress">
      {rows.map((r) => {
        const i = Math.max(0, SPECIALISM_STRANDS.indexOf(r.strand));
        const pct = r.minOptional ? Math.min(100, (r.pickedOptional / r.minOptional) * 100) : 0;
        const done = r.pickedOptional >= r.minOptional && r.compulsory.every((c) => c.picked);
        return (
          <div className={`strand-card${done ? " is-done" : ""}`} key={r.strand}>
            <div className="strand-card__head">
              <span className={`spec-tag spec-tag--${i}`}>{r.strand}</span>
              <span className="strand-card__count">
                {r.pickedOptional}/{r.minOptional} optional
              </span>
            </div>
            <div className="strand-card__bar">
              <div className={`strand-card__fill spec-fill--${i}`} style={{ width: `${pct}%` }} />
            </div>
            {r.compulsory.length > 0 && (
              <ul className="strand-card__comp">
                {r.compulsory.map((c) => (
                  <li key={c.name} className={c.picked ? "is-picked" : ""}>
                    {c.picked ? <CheckIcon width={12} height={12} /> : <span className="comp-dot" />}
                    {c.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
