// Preset course lists used to seed the UI.
import type { Course } from './course'

// The six standard Level 2 Computing Science courses used for Honours entry
// (ADS2, AF2, IOOP2, NOSE2, OOSE2 and WAD2), each 10 credits, 60 in total.
export const CS_L2_COURSES: Omit<Course, 'id'>[] = [
  { name: 'Algorithms & Data Structures 2', credit: '10', grade: '' },
  { name: 'Algorithmic Foundations 2', credit: '10', grade: '' },
  { name: 'Introduction to Object Oriented Programming', credit: '10', grade: '' },
  { name: 'Networks and Operating Systems Essentials 2', credit: '10', grade: '' },
  { name: 'Object-Oriented Software Engineering 2', credit: '10', grade: '' },
  { name: 'Web Application Development 2', credit: '10', grade: '' },
]

// Example Senior Honours year for Computing Science.
// Course titles and credit weights follow the UofG catalogue pattern.
export const EXAMPLE_COURSES: Omit<Course, 'id'>[] = [
  { name: 'Individual Project (H)', credit: '40', grade: 'A2' },
  { name: 'Team Project (H)', credit: '20', grade: 'A4' },
  { name: 'Machine Learning (H)', credit: '10', grade: 'B1' },
  { name: 'Artificial Intelligence (H)', credit: '10', grade: 'A5' },
  { name: 'Networked Systems (H)', credit: '10', grade: 'B2' },
  { name: 'Database Systems (H)', credit: '10', grade: 'C1' },
  { name: 'Functional Programming (H)', credit: '10', grade: 'B3' },
  { name: 'Professional Software Development (H)', credit: '10', grade: 'A3' },
]
