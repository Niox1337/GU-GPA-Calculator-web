import { Fragment } from 'react'
import type { Course } from '../lib'
import { computeDegree } from '../lib'
import { GraduationIcon } from './Icons'

/** Weighted multi-year degree summary (Honours, Integrated Masters). */
export default function DegreeSummary({
  years,
  weights,
  labels,
}: {
  years: Course[][]
  weights: number[]
  labels: string[]
}) {
  const r = computeDegree(years, weights)
  const ready = years.some((y) => y.some((c) => c.grade))
  const totalWeight = weights.reduce((s, w) => s + w, 0)

  return (
    <div className="honours-summary">
      <div className="honours-formula">
        {years.map((_, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="formula-op">+</span>}
            <div className="formula-term">
              <span className="formula-label">
                {labels[i]} · {weights[i] ?? 0}%
              </span>
              <span className="formula-value">{ready ? r.yearGpas[i].toFixed(1) : '-'}</span>
            </div>
          </Fragment>
        ))}
        <span className="formula-op">=</span>
        <div className="formula-term formula-term--final">
          <span className="formula-label">Final GPA</span>
          <span className="formula-value">{ready ? r.finalGpa.toFixed(1) : '-'}</span>
        </div>
      </div>

      {totalWeight !== 100 && (
        <p className="weight-note">
          Weights total {totalWeight}%, the final GPA is normalised to that total.
        </p>
      )}

      <div className={`classification${ready ? '' : ' is-empty'}`}>
        <GraduationIcon width={22} height={22} />
        <span>{ready ? r.classification : 'Add grades to see your degree classification'}</span>
      </div>

      {ready && r.borderline && (
        <p className="border-note">
          <strong>Borderline rule 16.37(d):</strong> a GPA of {r.finalGpa.toFixed(1)} falls between
          two bands, so the classification is set by the weighted grade profile, {r.reason}.
        </p>
      )}
    </div>
  )
}
