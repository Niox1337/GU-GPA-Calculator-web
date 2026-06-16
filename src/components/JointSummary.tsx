import { Fragment } from 'react'
import type { JointSubject } from '../lib'
import { computeJoint } from '../lib'
import { GraduationIcon } from './Icons'

/** Joint Honours summary: subjects aggregated over their years, then combined. */
export default function JointSummary({
  subjects,
  subjectWeights,
}: {
  subjects: JointSubject[]
  subjectWeights: number[]
}) {
  const r = computeJoint(subjects, subjectWeights)
  const ready = subjects.some((s) => s.years.some((y) => y.some((c) => c.grade)))
  const totalWeight = subjectWeights.reduce((s, w) => s + w, 0)

  return (
    <div className="honours-summary">
      <div className="honours-formula">
        {subjects.map((s, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="formula-op">+</span>}
            <div className="formula-term">
              <span className="formula-label">
                {s.name} · {subjectWeights[i] ?? 0}%
              </span>
              <span className="formula-value">{ready ? r.subjectGpas[i].toFixed(1) : '-'}</span>
            </div>
          </Fragment>
        ))}
        <span className="formula-op">=</span>
        <div className="formula-term formula-term--final">
          <span className="formula-label">Joint GPA</span>
          <span className="formula-value">{ready ? r.finalGpa.toFixed(1) : '-'}</span>
        </div>
      </div>

      {totalWeight !== 100 && (
        <p className="weight-note">
          Subject weights total {totalWeight}%, the joint GPA is normalised to that total.
        </p>
      )}

      <div className={`classification${ready ? '' : ' is-empty'}`}>
        <GraduationIcon width={22} height={22} />
        <span>{ready ? r.classification : 'Add grades to see your degree classification'}</span>
      </div>

      {ready && r.borderline && (
        <p className="border-note">
          <strong>Borderline rule 16.37(d):</strong> a joint GPA of {r.finalGpa.toFixed(1)} falls
          between two bands, so the classification is set by the weighted grade profile, {r.reason}.
        </p>
      )}
    </div>
  )
}
