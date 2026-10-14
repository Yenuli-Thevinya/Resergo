'use client'

import { useEffect, useId } from 'react'
import { X } from 'lucide-react'

type ModalProps = {
  kicker?: string
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}

/** Shared shell for every dialog: keeps the existing Resergo modal look. */
export function Modal({ kicker, title, subtitle, onClose, children }: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
          <X />
        </button>
        {kicker && <div className="modal-kicker">{kicker}</div>}
        <h2 id={titleId}>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
