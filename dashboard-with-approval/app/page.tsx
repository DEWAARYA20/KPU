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
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#7a0000' }}></div>
          <p className="text-gray-500 text-sm">Memuat...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) return null

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-50 text-gray-900">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-100" />
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #7a0000, #cc8800, #7a0000)' }} />

      {/* Decorative circles */}
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-5 pointer-events-none" style={{ background: 'radial-gradient(circle, #7a0000, transparent)' }} />
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-5 pointer-events-none" style={{ background: 'radial-gradient(circle, #cc8800, transparent)' }} />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src="/kpu-logo.png"
                alt="Logo KPU"
                className="w-12 h-12 object-contain drop-shadow-sm"
              />
              <div>
                <h1 className="text-gray-900 font-bold text-lg leading-tight tracking-wide">KOMISI PEMILIHAN UMUM</h1>
                <p className="text-xs tracking-widest font-semibold" style={{ color: '#7a0000' }}>KOTA PALU · SISTEM CATATAN HARIAN</p>
              </div>
            </div>
            {/* Nav buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/auth/login')}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
              >
                Masuk
              </Button>
              <Button
                onClick={() => router.push('/auth/sign-up')}
                className="text-white font-semibold shadow-md"
                style={{ background: 'linear-gradient(135deg, #7a0000, #a00000)' }}
              >
                Daftar
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* KPU Badge */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-full border border-gray-200 bg-white flex items-center justify-center shadow-md">
            <Shield className="w-12 h-12" style={{ color: '#7a0000' }} />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-medium border border-gray-200 bg-white shadow-sm" style={{ color: '#7a0000' }}>
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
          Sistem Resmi KPU
        </div>

        <h2 className="text-5xl md:text-6xl font-black text-gray-950 mb-6 leading-tight tracking-tight">
          Dashboard <span style={{ color: '#7a0000' }}>Catatan Harian</span><br />KPU <span className="text-gray-800">Kota Palu</span>
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
          Sistem manajemen catatan harian yang komprehensif dengan workflow persetujuan otomatis untuk meningkatkan produktivitas dan transparansi.
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => router.push('/auth/sign-up')}
            size="lg"
            className="text-white font-bold px-8 py-3 shadow-lg gap-2 animate-bounce"
            style={{ background: 'linear-gradient(135deg, #7a0000, #a00000)' }}
          >
            Mulai Sekarang <ArrowRight className="w-5 h-5" />
          </Button>
          <Button
            onClick={() => router.push('/auth/login')}
            size="lg"
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-white px-8 shadow-sm"
          >
            Login
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Fitur <span style={{ color: '#7a0000' }}>Utama</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: FileText, title: 'Input Catatan', desc: 'Catat kegiatan harian dengan mudah menggunakan form yang user-friendly', color: '#7a0000' },
            { icon: BookOpen, title: 'Buku Kendali', desc: 'Generate laporan buku kendali otomatis berdasarkan data yang telah diinput', color: '#7a0000' },
            { icon: CheckCircle, title: 'Workflow Approval', desc: 'Sistem persetujuan bertingkat untuk memastikan quality control yang baik', color: '#7a0000' },
            { icon: Users, title: 'Multi-User', desc: 'Mendukung multiple users dengan role-based access control yang aman', color: '#7a0000' },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="rounded-2xl p-6 border border-gray-200 bg-white hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(122,0,0,0.08)', border: `1px solid ${color}20` }}>
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <h4 className="text-gray-900 font-bold mb-2">{title}</h4>
              <p className="text-gray-600 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Cara <span style={{ color: '#7a0000' }}>Kerja</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { step: '1', title: 'Input Data', desc: 'Masukkan catatan harian dengan tanggal, aktivitas, dan hasil' },
            { step: '2', title: 'Ajukan Persetujuan', desc: 'Submit catatan kepada supervisor untuk disetujui' },
            { step: '3', title: 'Proses Review', desc: 'Pimpinan melakukan review dan approval catatan harian' },
            { step: '4', title: 'Buku Kendali', desc: 'Lihat dan cetak laporan buku kendali bulanan Anda' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center font-black text-lg mx-auto mb-4 shadow-md text-white"
                style={{ background: 'linear-gradient(135deg, #7a0000, #a00000)' }}>
                {step}
              </div>
              <h4 className="font-bold text-gray-900 mb-2">{title}</h4>
              <p className="text-gray-600 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-16 border-t border-b border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h3 className="text-3xl font-bold text-gray-900">Siap Meningkatkan <span style={{ color: '#7a0000' }}>Produktivitas</span> Anda?</h3>
          <p className="text-gray-600 text-lg">Bergabunglah dengan sistem manajemen catatan harian KPU yang modern dan efisien</p>
          <div className="flex gap-4 justify-center pt-2">
            <Button
              onClick={() => router.push('/auth/sign-up')}
              size="lg"
              className="font-bold px-8 gap-2 shadow-lg text-white"
              style={{ background: 'linear-gradient(135deg, #7a0000, #a00000)' }}
            >
              Daftar Gratis <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => router.push('/auth/login')}
              size="lg"
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-white px-8"
            >
              Login
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-200 py-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">© 2024 KPU Dashboard · Komisi Pemilihan Umum · Semua hak dilindungi</p>
        </div>
      </footer>
    </div>
  )
}
