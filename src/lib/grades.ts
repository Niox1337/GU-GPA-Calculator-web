// University of Glasgow Schedule A grade scale.
// The formulas match the original Tauri/Rust backend in src-tauri/src/main.rs.
//
// Schedule A is a 22-point scale:
//   A1=22 A2=21 A3=20 A4=19 A5=18 | B1=17 B2=16 B3=15 | C1=14 C2=13 C3=12
//   D1=11 D2=10 D3=9 | E1=8 E2=7 E3=6 | F1=5 F2=4 F3=3 | G1=2 G2=1 | H=0

// Base value per leading letter. Subtracting the numeric suffix gives the point value.
const LETTER_BASE: Record<string, number> = {
  A: 23,
  B: 18,
  C: 15,
  D: 12,
  E: 9,
  F: 6,
  G: 3,
  H: 0,
}

// Ordered Schedule A grades for selection UIs.
export const GRADES: string[] = [
  'A1', 'A2', 'A3', 'A4', 'A5',
  'B1', 'B2', 'B3',
  'C1', 'C2', 'C3',
  'D1', 'D2', 'D3',
  'E1', 'E2', 'E3',
  'F1', 'F2', 'F3',
  'G1', 'G2',
  'H',
]

export const BAND_LABELS: Record<string, string> = {
  A: 'A - Excellent',
  B: 'B - Very good',
  C: 'C - Good',
  D: 'D - Satisfactory',
  E: 'E - Weak',
  F: 'F - Poor',
  G: 'G - Very poor',
  H: 'H - Fail',
}

/** Converts a Schedule A grade such as "A1" to its point value, such as 22. */
export function gradePoint(grade: string): number {
  const g = grade.trim().toUpperCase()
  const base = LETTER_BASE[g[0]] ?? 0
  if (base === 0) return 0
  const second = parseInt(g[1] ?? '0', 10)
  return base - (Number.isNaN(second) ? 0 : second)
}

/** Converts a rounded point value back to the nearest Schedule A grade. */
export function pointToGrade(point: number): string {
  let letter: string
  if (point >= 18) letter = 'A'
  else if (point >= 15) letter = 'B'
  else if (point >= 12) letter = 'C'
  else if (point >= 9) letter = 'D'
  else if (point >= 6) letter = 'E'
  else if (point >= 3) letter = 'F'
  else if (point >= 1) letter = 'G'
  else return 'H'
  return `${letter}${LETTER_BASE[letter] - point}`
}

/** Returns the primary band used by the distribution chart. */
export function gradeBand(grade: string): string {
  const c = grade.trim().toUpperCase()[0]
  return LETTER_BASE[c] !== undefined ? c : 'H'
}
