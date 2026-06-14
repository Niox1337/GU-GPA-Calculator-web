import { useState } from 'react'
import type { Course } from '../lib/gpa'
import { computeYear, creditDistribution, honoursClass } from '../lib/gpa'
import { ChevronIcon } from './Icons'

interface Props {
  courses: Course[]
}

const bandClass = (band: string) => `band-${band.toLowerCase()}`

export default function ResultCard({ courses }: Props) {
  const [showSteps, setShowSteps] = useState(false)
  const result = computeYear(courses)
  const distribution = creditDistribution(courses)
  const hasData = result.countedCount > 0

  return (
    <div className="result-card" aria-live="polite">
      <div className="result-hero">
        <div className="result-gpa">
          <span className="result-gpa__label">Grade Point Average</span>
          <span className="result-gpa__value">{hasData ? result.gpa1dp.toFixed(1) : '-'}</span>
          <span className="result-gpa__scale">out of 22</span>
        </div>
        <div className={`grade-badge ${hasData ? bandClass(result.letter) : 'band-empty'}`}>
          <span className="grade-badge__letter">{hasData ? result.letter : '..'}</span>
          <span className="grade-badge__caption">Schedule A</span>
        </div>
      </div>

      <dl className="result-stats">
        <div className="stat">
          <dt>Total credits</dt>
          <dd>{hasData ? result.totalCredit : '-'}</dd>
        </div>
        <div className="stat">
          <dt>Courses counted</dt>
          <dd>{hasData ? result.countedCount : '-'}</dd>
        </div>
        <div className="stat stat--wide">
          <dt>Honours equivalent</dt>
          <dd className="stat--muted">{hasData ? honoursClass(result.gpa1dp) : '-'}</dd>
        </div>
      </dl>

      {hasData && distribution.length > 0 && (
        <div className="distribution">
          <span className="section-label">Credit distribution</span>
          <div className="dist-bar" role="img" aria-label="Credit distribution by grade band">
            {distribution.map((d) => (
              <span
                key={d.band}
                className={`dist-seg ${bandClass(d.band)}`}
                style={{ width: `${d.fraction * 100}%` }}
                title={`${d.label}: ${d.credit} credits`}
              />
            ))}
          </div>
          <ul className="dist-legend">
            {distribution.map((d) => (
              <li key={d.band}>
                <span className={`legend-dot ${bandClass(d.band)}`} />
                {d.band} - {Math.round(d.fraction * 100)}%
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasData && (
        <div className="steps">
          <button
            type="button"
            className="steps-toggle"
            onClick={() => setShowSteps((s) => !s)}
            aria-expanded={showSteps}
          >
            <ChevronIcon
              width={18}
              height={18}
              style={{ transform: showSteps ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
            />
            {showSteps ? 'Hide calculation steps' : 'Show calculation steps'}
          </button>
          {showSteps && (
            <div className="steps-body">
              <table className="steps-table">
                <thead>
                  <tr>
                    <th scope="col">Course</th>
                    <th scope="col">Grade</th>
                    <th scope="col" className="num">Points</th>
                    <th scope="col" className="num">Weight</th>
                    <th scope="col" className="num">Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {result.steps.map((s, i) => (
                    <tr key={i}>
                      <td>{s.name}</td>
                      <td>{s.grade}</td>
                      <td className="num">{s.point}</td>
                      <td className="num">{(s.weight * 100).toFixed(1)}%</td>
                      <td className="num">{s.contribution.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>GPA, sum of contributions</td>
                    <td className="num">{result.gpa.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
              <p className="steps-note">
                Each course is weighted by its share of total credits. Courses with no grade are
                disregarded. GPA rounds to <strong>{result.letter}</strong> ({result.gpa1dp.toFixed(1)}).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
