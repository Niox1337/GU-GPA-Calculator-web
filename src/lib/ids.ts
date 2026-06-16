// Stable id generation for course rows.
import type { Course } from './course'

export const newId = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

/** Attach fresh ids to preset course data so it can be used as live form rows. */
export const withIds = (list: Omit<Course, 'id'>[]): Course[] =>
  list.map((c) => ({ ...c, id: newId() }))
