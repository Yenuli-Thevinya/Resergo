'use client'

import { useState } from 'react'
import { api, errorMessage } from '@/lib/api-client'
import type { ResourceDTO, ResourceStatus } from '@/types'
import { ConfirmDialog } from './confirm-dialog'
import { Modal } from './modal'

type Props = {
  resource?: ResourceDTO
  onClose: () => void
  onSaved: (message: string) => void
}

const STATUS_OPTIONS: { value: ResourceStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'UNAVAILABLE', label: 'Unavailable' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
]

/** Admin-only create / edit / remove form. The server enforces the admin check again. */
export function ResourceFormDialog({ resource, onClose, onSaved }: Props) {
  const editing = !!resource
  const [name, setName] = useState(resource?.name ?? '')
  const [category, setCategory] = useState(resource?.category ?? 'Meeting room')
  const [description, setDescription] = useState(resource?.description ?? '')
  const [location, setLocation] = useState(resource?.location ?? '')
  const [capacity, setCapacity] = useState(resource?.capacity ?? '')
  const [status, setStatus] = useState<ResourceStatus>(resource?.status ?? 'AVAILABLE')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const body = { name, category, description, location, capacity, status }
      if (editing) await api(`/api/resources/${resource.id}`, { method: 'PATCH', body })
      else await api('/api/resources', { method: 'POST', body })
      onSaved(editing ? 'Resource updated successfully' : 'Resource created successfully')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!resource) return
    setBusy(true)
    setError(null)
    try {
      const result = await api<{ result: 'deleted' | 'deactivated' }>(`/api/resources/${resource.id}`, { method: 'DELETE' })
      onSaved(result.result === 'deleted' ? 'Resource deleted' : 'Resource deactivated (reservation history kept)')
    } catch (e) {
      setConfirmRemove(false)
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (confirmRemove && resource) {
    return (
      <ConfirmDialog
        title="Remove this resource?"
        message={`“${resource.name}” will be removed from the resource library. If it has reservation history it is deactivated so that history is kept.`}
        confirmLabel="Remove resource"
        cancelLabel="Keep resource"
        busy={busy}
        error={error}
        onConfirm={remove}
        onCancel={() => setConfirmRemove(false)}
      />
    )
  }

  return (
    <Modal
      kicker={editing ? 'ADMIN / EDIT RESOURCE' : 'ADMIN / NEW RESOURCE'}
      title={editing ? 'Edit resource' : 'Add a resource'}
      subtitle="Rooms, equipment and other shared items people can reserve."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required placeholder="e.g. Meeting Room D" />
        </label>

        <div className="form-two">
          <label>
            Category
            <input value={category} onChange={(e) => setCategory(e.target.value)} list="resource-categories" maxLength={50} required />
            <datalist id="resource-categories">
              <option value="Meeting room" />
              <option value="Conference room" />
              <option value="Equipment" />
              <option value="Other" />
            </datalist>
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as ResourceStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-two">
          <label>
            Location
            <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} required placeholder="e.g. 2nd floor" />
          </label>
          <label>
            Capacity
            <input value={capacity} onChange={(e) => setCapacity(e.target.value)} maxLength={40} placeholder="e.g. 10 seats" />
          </label>
        </div>

        <label>
          Description
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="Optional" />
        </label>

        {error && (
          <div className="availability-box has-conflict" role="alert">
            <strong>{error}</strong>
          </div>
        )}

        <div className="modal-bottom">
          {editing ? (
            <button type="button" className="ghost-button danger-text" onClick={() => setConfirmRemove(true)} disabled={busy}>
              Remove resource
            </button>
          ) : (
            <span />
          )}
          <div>
            <button type="button" className="ghost-button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="reserve-button" disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create resource'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
