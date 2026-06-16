import { useEffect, useState } from 'react'

export type Toast = { kind: 'success' | 'error'; msg: string }

/** Transient toast message that clears itself after `timeout` ms. */
export function useToast(timeout = 4000) {
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), timeout)
    return () => clearTimeout(t)
  }, [toast, timeout])

  return { toast, setToast }
}
