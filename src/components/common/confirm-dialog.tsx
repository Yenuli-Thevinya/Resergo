'use client'

import { Modal } from './modal'

type ConfirmDialogProps = {
  title: string
  message: string
  details?: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  details,
  confirmLabel,
  cancelLabel = 'Keep it',
  busy,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal kicker="PLEASE CONFIRM" title={title} subtitle={message} onClose={onCancel}>
      {details}
      {error && (
        <div className="availability-box has-conflict" role="alert">
          <strong>{error}</strong>
        </div>
      )}
      <div className="modal-bottom">
        <span />
        <div>
          <button type="button" className="ghost-button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className="danger-button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
