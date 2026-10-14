import { CalendarDays } from 'lucide-react'
import { Logo } from '@/components/common/logo'

export function AuthVisual() {
  return (
    <section className="auth-visual">
      <Logo />
      <div className="auth-art">
        <div className="auth-orbit orbit-a" />
        <div className="auth-orbit orbit-b" />
        <div className="auth-orbit orbit-c" />
        <div className="auth-center">
          <CalendarDays />
        </div>
        <span className="float-card card-a">
          Meeting Room A <b>Booked</b>
        </span>
        <span className="float-card card-b">
          12 resources <b>Available</b>
        </span>
      </div>
      <div className="auth-copy">
        <span>RESERGO / WORKSPACE</span>
        <h1>
          Make shared space
          <br />
          <em>work better.</em>
        </h1>
        <p>Reserve rooms, equipment and shared resources without scheduling conflicts.</p>
      </div>
    </section>
  )
}
