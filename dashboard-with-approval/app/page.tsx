'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileText, Users, CheckCircle, BookOpen, Shield, ArrowRight } from 'lucide-react'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setIsAuthenticated(!!user)
      } catch {
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'linear-gradient(135deg, #4a0000 0%, #7a0000 50%, #5c0000 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          <p className="text-yellow-200 text-sm">Memuat...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) return null

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #3a0000 0%, #6b0000 40%, #8b0000 70%, #5a0000 100%)' }}>

      {/* Decorative circles top-left */}
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #ff4444, transparent)' }} />
      <div className="absolute top-0 -left-8 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #ff6666, transparent)' }} />

      {/* Decorative circles top-right */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #ff4444, transparent)' }} />
      <div className="absolute top-4 -right-4 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #ff6666, transparent)' }} />

      {/* Decorative bottom splatter / wave */}
      <div className="absolute bottom-0 left-0 right-0 h-48 opacity-30" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 120%, #ff0000, transparent)'
      }} />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #cc0000, transparent)' }} />
      <div className="absolute bottom-10 left-16 w-4 h-4 rounded-full opacity-40" style={{ background: '#ff4444' }} />
      <div className="absolute bottom-6 left-32 w-2 h-2 rounded-full opacity-30" style={{ background: '#ff4444' }} />
      <div className="absolute bottom-16 right-24 w-3 h-3 rounded-full opacity-35" style={{ background: '#ff4444' }} />
      <div className="absolute bottom-4 right-16 w-5 h-5 rounded-full opacity-25" style={{ background: '#cc0000' }} />
      <div className="absolute bottom-0 right-0 w-28 h-28 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #cc0000, transparent)' }} />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/10 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {/* KPU Garuda emblem SVG placeholder */}
              <div className="w-12 h-12 rounded-full border-2 border-yellow-400 flex items-center justify-center overflow-hidden bg-white/10 backdrop-blur-sm">
                <div className="text-center">
                  <div className="text-yellow-400 font-black text-xs leading-tight">KPU</div>
                </div>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight tracking-wide">KOMISI PEMILIHAN UMUM</h1>
                <p className="text-yellow-300 text-xs tracking-widest">SISTEM CATATAN HARIAN</p>
              </div>
            </div>
            {/* Nav buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/auth/login')}
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10 hover:text-white bg-transparent backdrop-blur-sm"
              >
                Masuk
              </Button>
              <Button
                onClick={() => router.push('/auth/sign-up')}
                className="text-white font-semibold shadow-lg"
                style={{ background: 'linear-gradient(135deg, #cc8800, #ffbb00)' }}
              >
                Daftar
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        {/* KPU Badge */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-full border-4 border-yellow-400 bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl" style={{ boxShadow: '0 0 40px rgba(255,200,0,0.3)' }}>
            <Shield className="w-12 h-12 text-yellow-400" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-medium text-yellow-300 border border-yellow-400/40" style={{ background: 'rgba(255,200,0,0.1)' }}>
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
          Sistem Resmi KPU
        </div>

        <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
          Dashboard <span className="text-yellow-400">Catatan Harian</span><br />KPU
        </h2>
        <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10">
          Sistem manajemen catatan harian yang komprehensif dengan workflow persetujuan otomatis untuk meningkatkan produktivitas dan transparansi.
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => router.push('/auth/sign-up')}
            size="lg"
            className="text-white font-bold px-8 py-3 shadow-xl gap-2"
            style={{ background: 'linear-gradient(135deg, #cc8800, #ffbb00)', color: '#3a0000' }}
          >
            Mulai Sekarang <ArrowRight className="w-5 h-5" />
          </Button>
          <Button
            onClick={() => router.push('/auth/login')}
            size="lg"
            variant="outline"
            className="border-white/40 text-white hover:bg-white/10 bg-transparent px-8 backdrop-blur-sm"
          >
            Login
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h3 className="text-3xl font-bold text-white text-center mb-12">
          Fitur <span className="text-yellow-400">Utama</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: FileText, title: 'Input Catatan', desc: 'Catat kegiatan harian dengan mudah menggunakan form yang user-friendly', color: '#ffbb00' },
            { icon: BookOpen, title: 'Buku Kendali', desc: 'Generate laporan buku kendali otomatis berdasarkan data yang telah diinput', color: '#ffbb00' },
            { icon: CheckCircle, title: 'Workflow Approval', desc: 'Sistem persetujuan bertingkat untuk memastikan quality control yang baik', color: '#ffbb00' },
            { icon: Users, title: 'Multi-User', desc: 'Mendukung multiple users dengan role-based access control yang aman', color: '#ffbb00' },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="rounded-2xl p-6 border border-white/10 backdrop-blur-sm hover:border-yellow-400/40 transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,187,0,0.15)', border: `1px solid ${color}40` }}>
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <h4 className="text-white font-bold mb-2">{title}</h4>
              <p className="text-white/60 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h3 className="text-3xl font-bold text-white text-center mb-12">
          Cara <span className="text-yellow-400">Kerja</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { step: '1', title: 'Input Data', desc: 'Masukkan catatan harian dengan tanggal, aktivitas, dan hasil' },
            { step: '2', title: 'Ajukan Persetujuan', desc: 'Submit catatan kepada supervisor untuk disetujui' },
            { step: '3', title: 'Proses Review', desc: 'Pimpinan melakukan review dan approval catatan harian' },
            { step: '4', title: 'Buku Kendali', desc: 'Lihat dan cetak laporan buku kendali bulanan Anda' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center font-black text-lg mx-auto mb-4 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #cc8800, #ffbb00)', color: '#3a0000' }}>
                {step}
              </div>
              <h4 className="font-bold text-white mb-2">{title}</h4>
              <p className="text-white/60 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-16" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h3 className="text-3xl font-bold text-white">Siap Meningkatkan <span className="text-yellow-400">Produktivitas</span> Anda?</h3>
          <p className="text-white/70 text-lg">Bergabunglah dengan sistem manajemen catatan harian KPU yang modern dan efisien</p>
          <div className="flex gap-4 justify-center pt-2">
            <Button
              onClick={() => router.push('/auth/sign-up')}
              size="lg"
              className="font-bold px-8 gap-2 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #cc8800, #ffbb00)', color: '#3a0000' }}
            >
              Daftar Gratis <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => router.push('/auth/login')}
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 bg-transparent px-8"
            >
              Login
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6" style={{ background: 'rgba(0,0,0,0.4)' }}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-white/40 text-sm">© 2024 KPU Dashboard · Komisi Pemilihan Umum · Semua hak dilindungi</p>
        </div>
      </footer>
    </div>
  )
}
