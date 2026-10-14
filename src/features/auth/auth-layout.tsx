import { AuthVisual } from './auth-visual'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <AuthVisual />
      <section className="auth-panel">
        <div className="auth-card">{children}</div>
      </section>
    </main>
  )
}
