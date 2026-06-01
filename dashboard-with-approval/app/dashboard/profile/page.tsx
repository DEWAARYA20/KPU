'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, User, Eraser } from 'lucide-react'

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
  // Secretary specific
  signature?: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    full_name: '', nip: '', pangkat: '', jabatan: '',
    unit_kerja: '', nama_atasan: '', nip_atasan: '', jabatan_atasan: '',
    role: 'staff', signature: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

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
        // Draw existing signature on canvas
        if (data.signature && canvasRef.current) {
          const img = new Image()
          img.onload = () => canvasRef.current?.getContext('2d')?.drawImage(img, 0, 0)
          img.src = data.signature
        }
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

      // Get signature from canvas
      let signatureData = profile.signature || ''
      if (canvasRef.current) {
        signatureData = canvasRef.current.toDataURL('image/png')
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
        signature: signatureData,
        updated_at: new Date().toISOString(),
      })
      if (upsertError) throw upsertError
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
            {[
              { label: 'Nama Atasan Langsung', key: 'nama_atasan', placeholder: 'Nama lengkap + gelar' },
              { label: 'NIP Atasan', key: 'nip_atasan', placeholder: 'NIP atasan' },
              { label: 'Jabatan Atasan', key: 'jabatan_atasan', placeholder: 'Contoh: Sekretaris KPU Kota Palu' },
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

        {/* Tanda Tangan (khusus sekretaris/atasan) */}
        {isSecretary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tanda Tangan Digital</CardTitle>
              <CardDescription>
                Tanda tangan ini akan digunakan saat menyetujui laporan kinerja staff
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-gray-50">
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSignature}
                className="gap-2"
              >
                <Eraser className="w-4 h-4" />
                Hapus Tanda Tangan
              </Button>
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
