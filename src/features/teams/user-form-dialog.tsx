'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/common/modal'
import { useToast } from '@/context/toast-context'
import { useCurrentUser } from '@/context/user-context'
import { api, errorMessage } from '@/lib/api-client'
import type { DepartmentOption, Role, UserDTO, UserStatus } from '@/types'

type Props = {
  user?: UserDTO
  departments: DepartmentOption[]
  onClose: () => void
}

/** Admin-only add / edit employee form. The server enforces the admin check again. */
export function UserFormDialog({ user, departments, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const me = useCurrentUser()
  const editing = !!user
  const isSelf = user?.id === me.id

  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [departmentId, setDepartmentId] = useState<number>(user?.departmentId ?? departments[0]?.id ?? 0)
  const [role, setRole] = useState<Role>(user?.role ?? 'USER')
  const [status, setStatus] = useState<UserStatus>(user?.status ?? 'ACTIVE')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (editing) {
        await api(`/api/users/${user.id}`, {
          method: 'PATCH',
          body: { fullName, email, departmentId, role, status, ...(password ? { password } : {}) },
        })
        toast.success('Employee updated successfully')
      } else {
        await api('/api/users', { method: 'POST', body: { fullName, email, departmentId, role, status, password } })
        toast.success('Employee added successfully')
      }
      onClose()
      router.refresh()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      kicker={editing ? 'ADMIN / EDIT EMPLOYEE' : 'ADMIN / NEW EMPLOYEE'}
      title={editing ? 'Edit employee' : 'Add an employee'}
      subtitle="Only administrators can create or change accounts."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <label>
          Full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} required placeholder="e.g. Kasun Jayasuriya" />
        </label>
        <label>
          Work email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@company.com" autoComplete="off" />
        </label>

        <div className="form-two">
          <label>
            Department
            <select value={departmentId} onChange={(e) => setDepartmentId(Number(e.target.value))}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={isSelf}>
              <option value="USER">Employee</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
        </div>

        <div className="form-two">
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as UserStatus)} disabled={isSelf}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <label>
            {editing ? 'New password' : 'Password'}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              maxLength={72}
              required={!editing}
              placeholder={editing ? 'Leave blank to keep' : 'At least 8 characters'}
              autoComplete="new-password"
            />
          </label>
        </div>
        {isSelf && <p className="detail-note">You cannot change your own role or status.</p>}

        {error && (
          <div className="availability-box has-conflict" role="alert">
            <strong>{error}</strong>
          </div>
        )}

        <div className="modal-bottom">
          <span />
          <div>
            <button type="button" className="ghost-button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="reserve-button" disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Add employee'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
