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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { User, Lock, Briefcase, ChevronRight, ChevronLeft } from 'lucide-react'

const SUB_BAGIAN_OPTIONS = [
  'Kepala Sub Bagian Perencanaan, Data dan Informasi',
  'Kepala Sub Bagian Partisipasi, Hubungan Masyarakat dan Sumber Daya Manusia',
  'Kepala Sub Bagian Teknis Penyelenggaraan Pemilu dan Hukum',
  'Kepala Sub Bagian Keuangan Umum dan Logistik',
  'Kepala Bagian Perencanaan, Data dan Informasi',
  'Kepala Bagian Partisipasi, Hubungan Masyarakat dan Sumber Daya Manusia',
  'Kepala Bagian Teknis Penyelenggaraan Pemilu dan Hukum',
  'Kepala Bagian Keuangan Umum dan Logistik',
]

const PANGKAT_OPTIONS = [
  'Juru Muda / I-a',
  'Juru Muda Tk. I / I-b',
  'Juru / I-c',
  'Juru Tk. I / I-d',
  'Pengatur Muda / II-a',
  'Pengatur Muda Tk. I / II-b',
  'Pengatur / II-c',
  'Pengatur Tk. I / II-d',
  'Penata Muda / III-a',
  'Penata Muda Tk. I / III-b',
  'Penata / III-c',
  'Penata Tk. I / III-d',
  'Pembina / IV-a',
  'Pembina Tk. I / IV-b',
  'Pembina Utama Muda / IV-c',
  'Pembina Utama Madya / IV-d',
  'Pembina Utama / IV-e',
]

export default function Page() {
  const [step, setStep] = useState(1)

  // Step 1: Akun
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')

  // Step 2: Data Diri
  const [fullName, setFullName] = useState('')
  const [nip, setNip] = useState('')
  const [pangkat, setPangkat] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [subBagian, setSubBagian] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== repeatPassword) {
      setError('Password tidak sama. Silakan periksa kembali.')
      return
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }
    setStep(2)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) { setError('Nama lengkap wajib diisi.'); return }
    if (!nip.trim()) { setError('NIP wajib diisi.'); return }
    if (!pangkat) { setError('Pangkat/Golongan wajib dipilih.'); return }
    if (!jabatan.trim()) { setError('Jabatan wajib diisi.'); return }
    if (!subBagian) { setError('Sub Bagian wajib dipilih.'); return }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      // 1. Daftarkan akun
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
          },
        },
      })
      if (signUpError) throw signUpError

      // 2. Simpan profil ke tabel profiles
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          nip: nip,
          pangkat: pangkat,
          jabatan: jabatan,
          unit_kerja: subBagian,
          updated_at: new Date().toISOString(),
        })
        if (profileError) {
          console.error('Profile upsert error:', profileError)
        }
      }

      router.push('/auth/login?registered=true')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan, coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #3a0000 0%, #6b0000 40%, #8b0000 70%, #5a0000 100%)' }}>
      {/* Decorative elements */}
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #ff4444, transparent)' }} />
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #ff4444, transparent)' }} />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #cc0000, transparent)' }} />
      <div className="absolute bottom-0 right-0 w-28 h-28 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #cc0000, transparent)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1 mb-6">
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

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center gap-2 text-sm font-medium ${step === 1 ? 'text-yellow-400' : 'text-green-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${step === 1 ? 'bg-yellow-400 text-stone-900' : 'bg-green-500 text-white'}`}>
              {step === 1 ? '1' : '✓'}
            </div>
            <span className="text-white/80">Data Akun</span>
          </div>
          <div className="w-12 h-px bg-white/20" />
          <div className={`flex items-center gap-2 text-sm font-medium ${step === 2 ? 'text-yellow-400' : 'text-white/40'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${step === 2 ? 'bg-yellow-400 text-stone-900' : 'bg-white/10 text-white/40'}`}>
              2
            </div>
            <span className="text-white/80">Data Diri</span>
          </div>
        </div>

        <Card className="shadow-2xl border border-white/10" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
          {step === 1 ? (
            <>
              <CardHeader>
                <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-yellow-400" />
                <CardTitle className="text-xl text-white">Buat Akun</CardTitle>
              </div>
              <CardDescription className="text-white/60">Masukkan email dan password untuk akun Anda</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNextStep}>
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
                        className="h-11 bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password" className="text-white/80">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Minimal 6 karakter"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="repeat-password" className="text-white/80">Ulangi Password</Label>
                      <Input
                        id="repeat-password"
                        type="password"
                        placeholder="Masukkan password yang sama"
                        required
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        className="h-11 bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    {error && (
                      <div className="rounded-md bg-red-900/50 border border-red-500/50 p-3 text-sm text-red-200">
                        {error}
                      </div>
                    )}
                    <Button type="submit" className="w-full h-11 font-bold gap-2" style={{ background: 'linear-gradient(135deg, #cc8800, #ffbb00)', color: '#3a0000' }}>
                      Selanjutnya
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-5 text-center text-sm text-white/60">
                    Sudah punya akun?{' '}
                    <Link href="/auth/login" className="text-yellow-400 underline underline-offset-4 font-medium">
                      Login di sini
                    </Link>
                  </div>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-yellow-400" />
                <CardTitle className="text-xl text-white">Data Diri Pegawai</CardTitle>
              </div>
              <CardDescription className="text-white/60">Informasi ini akan digunakan pada laporan catatan harian</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp}>
                  <div className="flex flex-col gap-4">
                    {/* Nama Lengkap */}
                    <div className="grid gap-2">
                      <Label htmlFor="fullName" className="text-white/80">
                        Nama Lengkap <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Contoh: Ahmad Fauzi, S.Sos"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-11 bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    {/* NIP */}
                    <div className="grid gap-2">
                      <Label htmlFor="nip" className="text-white/80">
                        NIP <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="nip"
                        type="text"
                        placeholder="Contoh: 198501012010011001"
                        required
                        value={nip}
                        onChange={(e) => setNip(e.target.value.replace(/\D/g, ''))}
                        maxLength={18}
                        className="h-11 bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    {/* Pangkat */}
                    <div className="grid gap-2">
                      <Label htmlFor="pangkat" className="text-white/80">
                        Pangkat / Golongan <span className="text-red-400">*</span>
                      </Label>
                      <Select value={pangkat} onValueChange={setPangkat} required>
                        <SelectTrigger id="pangkat" className="h-11 bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Pilih pangkat/golongan..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PANGKAT_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Jabatan */}
                    <div className="grid gap-2">
                      <Label htmlFor="jabatan" className="text-white/80">
                        Jabatan <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="jabatan"
                        type="text"
                        placeholder="Contoh: Staf Teknis Pemilu"
                        required
                        value={jabatan}
                        onChange={(e) => setJabatan(e.target.value)}
                        className="h-11 bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    {/* Sub Bagian */}
                    <div className="grid gap-2">
                      <Label htmlFor="subBagian" className="text-white/80">
                        Bagian / Sub Bagian <span className="text-red-400">*</span>
                      </Label>
                      <Select value={subBagian} onValueChange={setSubBagian} required>
                        <SelectTrigger id="subBagian" className="h-11 bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Pilih sub bagian..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SUB_BAGIAN_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {error && (
                      <div className="rounded-md bg-red-900/50 border border-red-500/50 p-3 text-sm text-red-200">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3 pt-1">
                      <Button type="button" variant="outline" className="flex-1 h-11 gap-2 border-white/30 text-white hover:bg-white/10 bg-transparent" onClick={() => { setStep(1); setError(null) }}>
                        <ChevronLeft className="w-4 h-4" />
                        Kembali
                      </Button>
                      <Button type="submit" className="flex-1 h-11 font-bold gap-2" style={{ background: 'linear-gradient(135deg, #cc8800, #ffbb00)', color: '#3a0000' }} disabled={isLoading}>
                        <User className="w-4 h-4" />
                        {isLoading ? 'Mendaftar...' : 'Daftar Sekarang'}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-white/30 mt-4">
          © 2024 KPU Dashboard · Semua data dilindungi
        </p>
      </div>
    </div>
  )
}
