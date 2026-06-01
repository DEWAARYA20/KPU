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
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #3a0000 0%, #6b0000 40%, #8b0000 70%, #5a0000 100%)' }}>
      <div className="w-full max-w-sm">
        {/* Decorative background elements */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #ff4444, transparent)' }} />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #ff4444, transparent)' }} />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #cc0000, transparent)' }} />
        <div className="absolute bottom-0 right-0 w-28 h-28 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #cc0000, transparent)' }} />

        {/* Logo */}
        <div className="flex flex-col items-center gap-1 mb-6 relative z-10">
          <img
            src="/kpu-logo.png"
            alt="Logo KPU"
            className="w-20 h-20 object-contain drop-shadow-2xl"
            style={{ filter: 'drop-shadow(0 0 16px rgba(255,200,0,0.4))' }}
          />
          <p className="text-sm font-bold text-white tracking-widest mt-1">KOMISI PEMILIHAN UMUM</p>
          <p className="text-xs font-semibold text-white/80 tracking-widest">KOTA PALU</p>
          <p className="text-xs text-white/40 mt-0.5">Sistem Catatan Harian</p>
        </div>

        {/* Notifikasi sukses registrasi */}
        {justRegistered && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-green-400/30 p-3 text-sm text-green-300 relative z-10" style={{ background: 'rgba(0,100,0,0.2)' }}>
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Akun berhasil dibuat! Silakan login dengan email Anda.
          </div>
        )}

        <Card className="shadow-2xl border border-white/10 relative z-10" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-yellow-400" />
              <CardTitle className="text-xl text-white">Masuk</CardTitle>
            </div>
            <CardDescription className="text-white/60">
              Masukkan email dan password untuk mengakses dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-white/80">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contoh@kpu.go.id"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-white/80">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Masukkan password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-11 font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg, #cc8800, #ffbb00)', color: '#3a0000' }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Sedang masuk...' : 'Login'}
                </Button>
              </div>
              <div className="mt-5 text-center text-sm text-white/60">
                Belum punya akun?{' '}
                <Link
                  href="/auth/sign-up"
                  className="text-yellow-400 underline underline-offset-4 font-medium"
                >
                  Daftar di sini
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/30 mt-4 relative z-10">
          © 2024 KPU Dashboard · Semua data dilindungi
        </p>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh items-center justify-center" style={{ background: 'linear-gradient(160deg, #3a0000 0%, #6b0000 40%, #8b0000 70%, #5a0000 100%)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
