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
  'Sub Bagian Perencanaan, Data dan Informasi',
  'Sub Bagian Partisipasi, Hubungan Masyarakat dan Sumber Daya Manusia',
  'Sub Bagian Teknis Penyelenggaraan Pemilu dan Hukum',
  'Sub Bagian Keuangan Umum dan Logistik',
  'Bagian Perencanaan, Data dan Informasi',
  'Bagian Partisipasi, Hubungan Masyarakat dan Sumber Daya Manusia',
  'Bagian Teknis Penyelenggaraan Pemilu dan Hukum',
  'Bagian Keuangan Umum dan Logistik',
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
  const [isManualSubBagian, setIsManualSubBagian] = useState(false)
  const [manualSubBagian, setManualSubBagian] = useState('')

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

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    const finalSubBagian = isManualSubBagian ? manualSubBagian : subBagian

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
          unit_kerja: finalSubBagian,
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
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 relative overflow-hidden bg-gray-50">
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-100" />
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #7a0000, #cc8800, #7a0000)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1 mb-6">
          <img
            src="/kpu-logo.png"
            alt="Logo KPU"
            className="w-20 h-20 object-contain drop-shadow-md"
          />
          <p className="text-sm font-bold text-gray-800 tracking-widest mt-2">KOMISI PEMILIHAN UMUM</p>
          <p className="text-xs font-semibold tracking-widest" style={{ color: '#7a0000' }}>KOTA PALU</p>
          <p className="text-xs text-gray-400 mt-0.5">Sistem Catatan Harian</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center gap-2 text-sm font-medium ${step === 1 ? 'text-amber-700' : 'text-green-700'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${step === 1 ? 'bg-amber-600 text-white' : 'bg-green-600 text-white'}`}>
              {step === 1 ? '1' : '✓'}
            </div>
            <span className="text-gray-700 font-semibold">Data Akun</span>
          </div>
          <div className="w-12 h-px bg-gray-300" />
          <div className={`flex items-center gap-2 text-sm font-medium ${step === 2 ? 'text-amber-700' : 'text-gray-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${step === 2 ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
              2
            </div>
            <span className={step === 2 ? 'text-gray-700 font-semibold' : 'text-gray-400'}>Data Diri</span>
          </div>
        </div>

        <Card className="shadow-lg border border-gray-200 bg-white">
          {step === 1 ? (
            <>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5" style={{ color: '#7a0000' }} />
                  <CardTitle className="text-xl text-gray-900">Buat Akun</CardTitle>
                </div>
                <CardDescription className="text-gray-500">Masukkan email dan password untuk akun Anda</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNextStep}>
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
                        placeholder="Minimal 6 karakter"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="repeat-password" className="text-gray-700">Ulangi Password</Label>
                      <Input
                        id="repeat-password"
                        type="password"
                        placeholder="Masukkan password yang sama"
                        required
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        className="h-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                    {error && (
                      <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}
                    <Button type="submit" className="w-full h-11 font-bold text-sm text-white gap-2" style={{ background: 'linear-gradient(135deg, #7a0000, #a00000)' }}>
                      Selanjutnya
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-5 text-center text-sm text-gray-500">
                    Sudah punya akun?{' '}
                    <Link href="/auth/login" className="underline underline-offset-4 font-medium" style={{ color: '#7a0000' }}>
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
                  <Briefcase className="w-5 h-5" style={{ color: '#7a0000' }} />
                  <CardTitle className="text-xl text-gray-900">Data Diri Pegawai</CardTitle>
                </div>
                <CardDescription className="text-gray-500">Informasi ini akan digunakan pada laporan catatan harian</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp}>
                  <div className="flex flex-col gap-4">
                    {/* Nama Lengkap */}
                    <div className="grid gap-2">
                      <Label htmlFor="fullName" className="text-gray-700">
                        Nama Lengkap <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Contoh: Ahmad Fauzi, S.Sos"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      />
                    </div>

                    {/* NIP */}
                    <div className="grid gap-2">
                      <Label htmlFor="nip" className="text-gray-700">
                        NIP <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="nip"
                        type="text"
                        placeholder="Contoh: 198501012010011001"
                        required
                        value={nip}
                        onChange={(e) => setNip(e.target.value.replace(/\D/g, ''))}
                        maxLength={18}
                        className="h-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      />
                    </div>

                    {/* Pangkat */}
                    <div className="grid gap-2">
                      <Label htmlFor="pangkat" className="text-gray-700">
                        Pangkat / Golongan <span className="text-red-500">*</span>
                      </Label>
                      <Select value={pangkat} onValueChange={setPangkat} required>
                        <SelectTrigger id="pangkat" className="h-11 bg-white border-gray-300 text-gray-900">
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
                      <Label htmlFor="jabatan" className="text-gray-700">
                        Jabatan <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="jabatan"
                        type="text"
                        placeholder="Contoh: Staf Teknis Pemilu"
                        required
                        value={jabatan}
                        onChange={(e) => setJabatan(e.target.value)}
                        className="h-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      />
                    </div>

                    {/* Sub Bagian */}
                    <div className="grid gap-2">
                      <Label htmlFor="subBagian" className="text-gray-700">
                        Bagian / Sub Bagian <span className="text-gray-400 font-normal">(Opsional)</span>
                      </Label>
                      {!isManualSubBagian ? (
                        <Select
                          value={subBagian}
                          onValueChange={(v) => {
                            if (v === 'manual') {
                              setIsManualSubBagian(true)
                              setSubBagian('')
                            } else {
                              setSubBagian(v)
                            }
                          }}
                        >
                          <SelectTrigger id="subBagian" className="h-11 bg-white border-gray-300 text-gray-900">
                            <SelectValue placeholder="Pilih bagian..." />
                          </SelectTrigger>
                          <SelectContent>
                            {SUB_BAGIAN_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                            <SelectItem value="manual" className="font-semibold text-amber-600">
                              + Tulis Manual...
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Tulis Bagian / Sub Bagian..."
                            value={manualSubBagian}
                            onChange={(e) => setManualSubBagian(e.target.value)}
                            className="h-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsManualSubBagian(false)
                              setManualSubBagian('')
                            }}
                            className="h-11 px-3 border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                          >
                            Kembali
                          </Button>
                        </div>
                      )}
                    </div>

                    {error && (
                      <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3 pt-1">
                      <Button type="button" variant="outline" className="flex-1 h-11 gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white" onClick={() => { setStep(1); setError(null) }}>
                        <ChevronLeft className="w-4 h-4" />
                        Kembali
                      </Button>
                      <Button type="submit" className="flex-1 h-11 font-bold text-sm text-white gap-2" style={{ background: 'linear-gradient(135deg, #7a0000, #a00000)' }} disabled={isLoading}>
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

        <p className="text-center text-xs text-gray-400 mt-4">
          © 2024 KPU Dashboard · Semua data dilindungi
        </p>
      </div>
    </div>
  )
}
