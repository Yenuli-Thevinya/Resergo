import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AuthLayout } from './auth-layout'
import { LoginForm } from './login-form'

export async function LoginPage() {
  if (await getCurrentUser()) redirect('/') // already signed in
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  )
}
