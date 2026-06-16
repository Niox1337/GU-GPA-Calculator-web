import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

/** useState backed by localStorage under `key`, falling back to `initial`. */
export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Private browsing and full storage should not stop the calculator working.
    }
  }, [key, value])

  return [value, setValue]
}
