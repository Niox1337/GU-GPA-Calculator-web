import { creditStatus } from "../lib";

/** Short label describing how planned credits sit against a target. */
function creditNote(diff: number): string {
  if (diff < 0) return `${-diff} under`;
  if (diff > 0) return `${diff} over`;
  return "on target";
}

/** Labelled progress bar comparing planned credits to a target. */
export default function CreditMeter({
  label,
  planned,
  target,
}: {
  label: string;
  planned: number;
  target: number;
}) {
  const s = creditStatus(planned, target);
  const fill = target > 0 ? Math.min(planned / target, 1) : 0;
  return (
    <div className={`credit-meter is-${s.status}`}>
      <div className="credit-meter__top">
        <span className="credit-meter__count">
          {label} · {planned} / {target} credits
        </span>
        <span className="credit-meter__note">{creditNote(s.diff)}</span>
      </div>
      <div
        className="credit-meter__bar"
        role="img"
        aria-label={`${label}, ${planned} of ${target} credits, ${creditNote(s.diff)}`}
      >
        <span className="credit-meter__fill" style={{ width: `${fill * 100}%` }} />
      </div>
    </div>
  );
}
