'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { LogIn, CheckCircle } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get('registered') === 'true'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/dashboard')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Email atau password salah.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 relative overflow-hidden bg-gray-50">
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-100" />
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #7a0000, #cc8800, #7a0000)' }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1 mb-8">
          <img
            src="/kpu-logo.png"
            alt="Logo KPU"
            className="w-24 h-24 object-contain drop-shadow-md"
          />
          <p className="text-sm font-bold text-gray-800 tracking-widest mt-2">KOMISI PEMILIHAN UMUM</p>
          <p className="text-xs font-semibold tracking-widest" style={{ color: '#7a0000' }}>KOTA PALU</p>
          <p className="text-xs text-gray-400 mt-0.5">Sistem Catatan Harian</p>
        </div>

        {/* Notifikasi sukses registrasi */}
        {justRegistered && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-green-300 p-3 text-sm text-green-700 bg-green-50">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Akun berhasil dibuat! Silakan login dengan email Anda.
          </div>
        )}

        <Card className="shadow-lg border border-gray-200 bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LogIn className="w-5 h-5" style={{ color: '#7a0000' }} />
              <CardTitle className="text-xl text-gray-900">Masuk</CardTitle>
            </div>
            <CardDescription className="text-gray-500">
              Masukkan email dan password untuk mengakses dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-gray-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contoh@kpu.go.id"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-gray-700">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Masukkan password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-11 font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #7a0000, #a00000)' }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Sedang masuk...' : 'Login'}
                </Button>
              </div>
              <div className="mt-5 text-center text-sm text-gray-500">
                Belum punya akun?{' '}
                <Link
                  href="/auth/sign-up"
                  className="underline underline-offset-4 font-medium"
                  style={{ color: '#7a0000' }}
                >
                  Daftar di sini
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-4">
          © 2024 KPU Dashboard · Semua data dilindungi
        </p>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#7a0000' }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
