import { SPECIALISM_STRANDS } from "../lib/catalogue";

/** Coloured pills for a course's specialism strands; renders nothing when empty. */
export default function StrandTags({ strands }: { strands: string[] }) {
  if (strands.length === 0) return null;
  return (
    <>
      {strands.map((s) => (
        <span
          key={s}
          className={`spec-tag spec-tag--${Math.max(0, SPECIALISM_STRANDS.indexOf(s))}`}
          title={`${s} specialism`}
        >
          {s}
        </span>
      ))}
    </>
  );
}
