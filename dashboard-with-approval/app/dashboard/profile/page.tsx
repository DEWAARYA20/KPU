'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, User, Eraser } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Profile {
  full_name: string
  nip: string
  pangkat: string
  jabatan: string
  unit_kerja: string
  nama_atasan: string
  nip_atasan: string
  jabatan_atasan: string
  role: string
  signature?: string
}

interface SupervisorInfo {
  full_name: string
  nip: string
  unit_kerja: string
  jabatan: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    full_name: '', nip: '', pangkat: '', jabatan: '',
    unit_kerja: '', nama_atasan: '', nip_atasan: '', jabatan_atasan: '',
    role: 'staff', signature: '',
  })
  const [supervisors, setSupervisors] = useState<SupervisorInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Signature states
  const [signMethod, setSignMethod] = useState<'draw' | 'upload'>('draw')
  const [uploadedSign, setUploadedSign] = useState<string>('')
  const [isEditingSignature, setIsEditingSignature] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          nip: data.nip || '',
          pangkat: data.pangkat || '',
          jabatan: data.jabatan || '',
          unit_kerja: data.unit_kerja || '',
          nama_atasan: data.nama_atasan || '',
          nip_atasan: data.nip_atasan || '',
          jabatan_atasan: data.jabatan_atasan || '',
          role: data.role || 'staff',
          signature: data.signature || '',
        })
        if (!data.signature) {
          setIsEditingSignature(true)
        }
      } else {
        setIsEditingSignature(true)
      }

      // Fetch registered supervisors
      const { data: sups } = await supabase
        .from('profiles')
        .select('full_name, nip, unit_kerja, jabatan')
        .or('role.in.(head,secretary,admin),unit_kerja.ilike.Kepala%,jabatan.ilike.Kepala%')
      
      if (sups) {
        // Filter unique supervisors with names and NIPs
        const uniqueSups = (sups as SupervisorInfo[]).filter(
          (s, idx, self) => s.full_name && s.nip && self.findIndex(t => t.nip === s.nip) === idx
        )
        setSupervisors(uniqueSups)
      }

      setLoading(false)
    }
    loadProfile()
  }, [supabase])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    setLastPos(getPos(e, canvas))
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.x, lastPos.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    setLastPos(pos)
    setHasDrawn(true)
  }

  const stopDraw = () => setIsDrawing(false)

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get signature from canvas or uploaded image
      let signatureData = profile.signature || ''
      if (isEditingSignature) {
        if (signMethod === 'draw') {
          if (canvasRef.current && hasDrawn) {
            signatureData = canvasRef.current.toDataURL('image/png')
          } else {
            signatureData = ''
          }
        } else if (signMethod === 'upload') {
          signatureData = uploadedSign || ''
        }
      }

      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: profile.full_name,
        nip: profile.nip,
        pangkat: profile.pangkat,
        jabatan: profile.jabatan,
        unit_kerja: profile.unit_kerja,
        nama_atasan: profile.nama_atasan,
        nip_atasan: profile.nip_atasan,
        jabatan_atasan: profile.jabatan_atasan,
        role: profile.role,
        signature: signatureData,
        updated_at: new Date().toISOString(),
      })
      if (upsertError) throw upsertError

      setProfile(p => ({ ...p, signature: signatureData }))
      setIsEditingSignature(!signatureData)
      setUploadedSign('')
      setHasDrawn(false)

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil')
    } finally {
      setSaving(false)
    }
  }

  const isSecretary = profile.role === 'secretary' || profile.role === 'head' || profile.role === 'admin'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profil Saya</h1>
        <p className="text-gray-600 mt-1">Lengkapi data diri untuk template laporan kinerja</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Data Pegawai */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" />
              Data Pegawai
            </CardTitle>
            <CardDescription>Informasi ini akan muncul di template laporan kinerja harian</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Nama Lengkap', key: 'full_name', placeholder: 'Contoh: Ahmad Fauzi, S.Sos' },
              { label: 'NIP', key: 'nip', placeholder: 'Contoh: 198501012010011001' },
              { label: 'Pangkat / Golongan', key: 'pangkat', placeholder: 'Contoh: Penata Muda Tk. I / III-b' },
              { label: 'Jabatan', key: 'jabatan', placeholder: 'Contoh: Staf Teknis Pemilu' },
              { label: 'Unit Kerja / Instansi', key: 'unit_kerja', placeholder: 'Contoh: KPU Kota Palu' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <Input
                  value={profile[key as keyof Profile] as string}
                  onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Data Atasan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Atasan Langsung</CardTitle>
            <CardDescription>Akan muncul di kolom tanda tangan kanan pada laporan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dropdown Select Atasan */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Pilih Atasan Terdaftar <span className="text-gray-400 font-normal">(Opsional)</span>
              </label>
              <Select
                onValueChange={(nipVal) => {
                  const selected = supervisors.find(s => s.nip === nipVal)
                  if (selected) {
                    setProfile(p => ({
                      ...p,
                      nama_atasan: selected.full_name,
                      nip_atasan: selected.nip,
                      jabatan_atasan: selected.unit_kerja || selected.jabatan || '',
                    }))
                  }
                }}
              >
                <SelectTrigger className="w-full bg-white text-stone-900 border border-stone-200">
                  <SelectValue placeholder="Pilih atasan terdaftar..." />
                </SelectTrigger>
                <SelectContent className="bg-white text-stone-900 border border-stone-200">
                  {supervisors.map((s) => (
                    <SelectItem key={s.nip} value={s.nip}>
                      {s.full_name} ({s.unit_kerja || s.jabatan || 'Atasan'})
                    </SelectItem>
                  ))}
                  {supervisors.length === 0 && (
                    <div className="p-2 text-sm text-stone-400 text-center">Tidak ada atasan terdaftar</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="h-px bg-stone-100 my-2" />

            {/* Nama Atasan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Atasan Langsung</label>
              <Input
                value={profile.nama_atasan}
                onChange={e => setProfile(p => ({ ...p, nama_atasan: e.target.value }))}
                placeholder="Nama lengkap + gelar"
              />
            </div>

            {/* NIP Atasan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIP Atasan</label>
              <Input
                value={profile.nip_atasan}
                onChange={async (e) => {
                  const val = e.target.value
                  setProfile(p => ({ ...p, nip_atasan: val }))
                  
                  // Trigger lookup when NIP is exactly 18 digits (Indonesian NIP length)
                  const cleanNip = val.replace(/\D/g, '')
                  if (cleanNip.length === 18) {
                    const { data, error } = await supabase
                      .from('profiles')
                      .select('full_name, unit_kerja, jabatan')
                      .eq('nip', cleanNip)
                      .maybeSingle()
                    
                    if (!error && data) {
                      setProfile(p => ({
                        ...p,
                        nama_atasan: data.full_name || p.nama_atasan,
                        jabatan_atasan: data.unit_kerja || data.jabatan || p.jabatan_atasan,
                      }))
                    }
                  }
                }}
                placeholder="NIP atasan"
              />
            </div>

            {/* Jabatan Atasan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan Atasan</label>
              <Input
                value={profile.jabatan_atasan}
                onChange={e => setProfile(p => ({ ...p, jabatan_atasan: e.target.value }))}
                placeholder="Contoh: Sekretaris KPU Kota Palu"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tanda Tangan (khusus sekretaris/atasan) */}
        {isSecretary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tanda Tangan Digital</CardTitle>
              <CardDescription>
                Tanda tangan ini akan digunakan saat menyetujui laporan kinerja staff
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.signature && !isEditingSignature ? (
                <div className="space-y-3">
                  <div className="bg-white border border-stone-200 rounded-lg p-4 flex justify-center items-center h-36 max-w-md">
                    <img
                      src={profile.signature}
                      alt="Tanda Tangan Tersimpan"
                      className="max-h-32 object-contain"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingSignature(true)
                      setUploadedSign('')
                      setHasDrawn(false)
                    }}
                    className="gap-2"
                  >
                    <Eraser className="w-4 h-4" />
                    Ganti Tanda Tangan
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selector Method */}
                  <div className="flex bg-stone-100 p-0.5 rounded-md text-xs font-medium max-w-xs mb-1">
                    <button
                      type="button"
                      onClick={() => setSignMethod('draw')}
                      className={`flex-1 py-1.5 rounded-md transition-all ${
                        signMethod === 'draw' ? 'bg-white shadow text-stone-900 font-semibold' : 'text-stone-500 hover:text-stone-900'
                      }`}
                    >
                      Tanda Tangan Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignMethod('upload')}
                      className={`flex-1 py-1.5 rounded-md transition-all ${
                        signMethod === 'upload' ? 'bg-white shadow text-stone-900 font-semibold' : 'text-stone-500 hover:text-stone-900'
                      }`}
                    >
                      Unggah Scan / Foto
                    </button>
                  </div>

                  {/* Draw canvas */}
                  {signMethod === 'draw' && (
                    <div className="space-y-2">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-gray-50 max-w-md">
                        <canvas
                          ref={canvasRef}
                          width={500}
                          height={150}
                          className="w-full bg-white border border-gray-200 rounded cursor-crosshair touch-none"
                          style={{ touchAction: 'none' }}
                          onMouseDown={startDraw}
                          onMouseMove={draw}
                          onMouseUp={stopDraw}
                          onMouseLeave={stopDraw}
                          onTouchStart={startDraw}
                          onTouchMove={draw}
                          onTouchEnd={stopDraw}
                        />
                        <p className="text-xs text-gray-500 text-center mt-1">
                          Gambar tanda tangan Anda di area di atas
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            clearSignature()
                            setHasDrawn(false)
                          }}
                          className="gap-2"
                        >
                          <Eraser className="w-4 h-4" />
                          Hapus Coretan
                        </Button>
                        {profile.signature && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsEditingSignature(false)
                              setUploadedSign('')
                              setHasDrawn(false)
                            }}
                            className="text-stone-500 hover:text-stone-900"
                          >
                            Batal
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Upload Image */}
                  {signMethod === 'upload' && (
                    <div className="space-y-3 max-w-md">
                      <div className="border border-stone-200 rounded-lg p-4 bg-white text-center space-y-3">
                        <input
                          type="file"
                          accept="image/*"
                          id="profile-sign-upload"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setUploadedSign(reader.result as string)
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                        <label
                          htmlFor="profile-sign-upload"
                          className="inline-block px-4 py-2 bg-white border border-stone-300 rounded-md text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer shadow-sm"
                        >
                          Pilih File Gambar Tanda Tangan
                        </label>
                        
                        {uploadedSign ? (
                          <div className="bg-white border rounded p-2 flex justify-center items-center h-28 mt-2">
                            <img
                              src={uploadedSign}
                              alt="Uploaded Signature"
                              className="max-h-24 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="h-28 border border-dashed rounded flex justify-center items-center text-xs text-stone-400">
                            Belum ada gambar terpilih
                          </div>
                        )}
                      </div>
                      {profile.signature && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingSignature(false)
                            setUploadedSign('')
                            setHasDrawn(false)
                          }}
                          className="text-stone-500 hover:text-stone-900"
                        >
                          Batal
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status messages */}
        {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {success && <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">✓ Profil berhasil disimpan!</div>}

        <Button type="submit" disabled={saving} className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4" />
          {saving ? 'Menyimpan...' : 'Simpan Profil'}
        </Button>
      </form>
    </div>
  )
}
