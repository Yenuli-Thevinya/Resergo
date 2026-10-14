'use client'

import { AlertTriangle } from 'lucide-react'

/** Shown when a page fails to load (for example when the database is unreachable). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const dbDown = /ECONNREFUSED|P100[12]|Can't reach database|connect/i.test(error.message)
  return (
    <div className="empty-state" role="alert" style={{ marginTop: 24 }}>
      <div>
        <AlertTriangle />
        <h3>{dbDown ? 'Unable to connect to the database.' : 'Something went wrong while loading this page.'}</h3>
        <p>{dbDown ? 'Please check that PostgreSQL is running and DATABASE_URL is correct, then try again.' : 'Please try again. If the problem continues, contact your administrator.'}</p>
        <div style={{ marginTop: 14 }}>
          <button className="reserve-button" onClick={reset}>
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
