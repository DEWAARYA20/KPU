'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SKPTemplate } from '@/components/skp-template'
import { CheckCircle, XCircle, Eye, EyeOff, Eraser, PenLine, Trash2, RotateCcw, Edit3 } from 'lucide-react'

interface ActivityRecord {
  id: string
  tanggal: string
  hari: string
  uraian_kegiatan: string
  output_hasil: string
  status: string
}

interface BukuKendali {
  id: string
  user_id: string
  bulan: number
  tahun: number
  status: 'submitted' | 'approved'
  approved_at?: string
  secretary_name?: string
  secretary_nip?: string
  secretary_signature?: string
  signed_at?: string
  user_signature?: string
  nilai?: number
  jumlah_hari_kerja?: number
  userName?: string
  userNip?: string
  userPangkat?: string
  userJabatan?: string
  userUnitKerja?: string
  userNamaAtasan?: string
  userNipAtasan?: string
  userJabatanAtasan?: string
  records: ActivityRecord[]
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export default function ApprovalsPage() {
  const [pendingApprovals, setPendingApprovals] = useState<BukuKendali[]>([])
  const [approvedRecords, setApprovedRecords] = useState<BukuKendali[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [secretaryProfile, setSecretaryProfile] = useState({ name: '', nip: '', signature: '' })
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [signingId, setSigningId] = useState<string | null>(null)
  const [signMethod, setSignMethod] = useState<'profile' | 'draw'>('draw')
  const [jumlahHariKerjaInput, setJumlahHariKerjaInput] = useState<Record<string, number | ''>>({})

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })

  const supabase = createClient()

  useEffect(() => {
    loadApprovals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadApprovals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      if (!profile) return

      let role = profile.role || 'staff'
      // Case-insensitive check for supervisor by unit/jabatan
      const jabatanLower = (profile.jabatan || '').toLowerCase()
      const unitLower = (profile.unit_kerja || '').toLowerCase()
      const isSupervisorUnit = unitLower.startsWith('kepala') || jabatanLower.startsWith('kepala')
      let isSupervisorNip = false

      if (profile.nip) {
        const { count, error } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('nip_atasan', profile.nip)

        if (!error && count && count > 0) {
          isSupervisorNip = true
        }
      }

      if (isSupervisorUnit || isSupervisorNip) {
        if (role === 'staff') role = 'head'
      }

      if (!['secretary', 'head', 'admin'].includes(role)) {
        setLoading(false)
        return
      }

      setUserRole(role)
      setSecretaryProfile({
        name: profile.full_name || '',
        nip: profile.nip || '',
        signature: profile.signature || '',
      })

      if (profile.signature) {
        setSignMethod('profile')
      } else {
        setSignMethod('draw')
      }

      // Load ALL profiles to properly determine subordinates
      const { data: allProfilesData, error: allPError } = await supabase
        .from('profiles')
        .select('id, full_name, nip, pangkat, jabatan, unit_kerja, nama_atasan, nip_atasan, jabatan_atasan')

      if (allPError || !allProfilesData) {
        console.error('Error loading all profiles:', allPError)
        return
      }

      // Determine subordinate IDs based on role
      let subordinateIds: string[] = []
      if (role === 'admin') {
        // Admin sees all submissions
        subordinateIds = allProfilesData.map(p => p.id)
      } else {
        // Head/Secretary: match by nip_atasan field in subordinate profiles
        const byNipAtasan = allProfilesData
          .filter(p => p.nip_atasan && p.nip_atasan.trim() === (profile.nip || '').trim())
          .map(p => p.id)

        if (byNipAtasan.length > 0) {
          subordinateIds = byNipAtasan
        } else {
          // Fallback: if nip_atasan not set up, show all submitted so nothing is lost
          subordinateIds = allProfilesData.map(p => p.id)
        }
      }

      // Load pending buku_kendali for subordinates
      // NOTE: 'nilai' and 'jumlah_hari_kerja' columns might not exist yet - handle gracefully
      let bukuData: any[] | null = null
      let bkError: any = null

      try {
        const result = await supabase
          .from('buku_kendali')
          .select(`id, user_id, bulan, tahun, status, approved_at, secretary_name, secretary_nip, secretary_signature, signed_at, user_signature, nilai, jumlah_hari_kerja`)
          .in('status', ['submitted', 'approved'])
          .in('user_id', subordinateIds)
          .order('tahun', { ascending: false })
        bukuData = result.data
        bkError = result.error
      } catch {
        // If query failed (e.g. column missing), retry
      }

      if (bkError || !bukuData) {
        try {
          const result2 = await supabase
            .from('buku_kendali')
            .select(`id, user_id, bulan, tahun, status, approved_at, secretary_name, secretary_nip, secretary_signature, signed_at, user_signature, nilai`)
            .in('status', ['submitted', 'approved'])
            .in('user_id', subordinateIds)
            .order('tahun', { ascending: false })
          bukuData = result2.data
          bkError = result2.error
        } catch {
          const result3 = await supabase
            .from('buku_kendali')
            .select(`id, user_id, bulan, tahun, status, approved_at, secretary_name, secretary_nip, secretary_signature, signed_at, user_signature`)
            .in('status', ['submitted', 'approved'])
            .in('user_id', subordinateIds)
            .order('tahun', { ascending: false })
          bukuData = result3.data
          bkError = result3.error
        }
      }

      if (bkError) {
        console.error('Error loading buku_kendali:', bkError)
      }

      const safeBukuData = bukuData ?? []

      if (safeBukuData.length === 0) {
        setPendingApprovals([])
        setApprovedRecords([])
        setLoading(false)
        return
      }

      // Only use profiles that have submitted buku_kendali
      const userIds = Array.from(new Set(safeBukuData.map((b: any) => b.user_id)))
      const profilesData = allProfilesData.filter(p => userIds.includes(p.id))

      // Filter bukuData to only subordinates
      const filteredBuku = safeBukuData.filter((b: any) => subordinateIds.includes(b.user_id))
      if (filteredBuku.length === 0) {
        setPendingApprovals([])
        setApprovedRecords([])
        setLoading(false)
        return
      }

      // Fetch records for these users
      const { data: recordsData, error: rError } = await supabase
        .from('activity_records')
        .select('id, user_id, tanggal, hari, uraian_kegiatan, output_hasil, status, bulan, tahun')
        .in('user_id', subordinateIds)
        .in('status', ['submitted', 'approved'])

      if (rError || !recordsData) {
        console.error('Error loading activity records:', rError)
        return
      }

      // Enrich and map
      const enriched: BukuKendali[] = filteredBuku.map(buku => {
        const uProfile = profilesData.find(p => p.id === buku.user_id)
        const uRecords = recordsData.filter(
          r => r.user_id === buku.user_id && r.bulan === buku.bulan && r.tahun === buku.tahun
        )
        return {
          id: buku.id,
          user_id: buku.user_id,
          bulan: buku.bulan,
          tahun: buku.tahun,
          status: buku.status,
          approved_at: buku.approved_at,
          secretary_name: buku.secretary_name,
          secretary_nip: buku.secretary_nip,
          secretary_signature: buku.secretary_signature,
          signed_at: buku.signed_at,
          user_signature: buku.user_signature,
          nilai: buku.nilai,
          jumlah_hari_kerja: buku.jumlah_hari_kerja,
          userName: uProfile?.full_name || 'Pegawai',
          userNip: uProfile?.nip || '',
          userPangkat: uProfile?.pangkat || '',
          userJabatan: uProfile?.jabatan || '',
          userUnitKerja: uProfile?.unit_kerja || '',
          userNamaAtasan: uProfile?.nama_atasan || '',
          userNipAtasan: uProfile?.nip_atasan || '',
          userJabatanAtasan: uProfile?.jabatan_atasan || '',
          records: uRecords,
        }
      })

      setPendingApprovals(enriched.filter(b => b.status === 'submitted'))
      setApprovedRecords(enriched.filter(b => b.status === 'approved'))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

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

  const handleApprove = async (buku: BukuKendali, signatureImg: string, nilaiVal: number, jumlahHariKerjaVal: number) => {
    setLoading(true)
    const now = new Date().toISOString()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      // 1. Update buku_kendali table
      try {
        await supabase
          .from('buku_kendali')
          .update({
            status: 'approved',
            approved_by: user.id,
            approved_at: now,
            secretary_signature: signatureImg,
            secretary_name: secretaryProfile.name,
            secretary_nip: secretaryProfile.nip,
            signed_at: now,
            nilai: nilaiVal,
            jumlah_hari_kerja: jumlahHariKerjaVal,
          })
          .eq('id', buku.id)
      } catch (err) {
        console.warn('Gagal menyimpan jumlah_hari_kerja, fallback update tanpa kolom tersebut:', err)
        await supabase
          .from('buku_kendali')
          .update({
            status: 'approved',
            approved_by: user.id,
            approved_at: now,
            secretary_signature: signatureImg,
            secretary_name: secretaryProfile.name,
            secretary_nip: secretaryProfile.nip,
            signed_at: now,
            nilai: nilaiVal,
          })
          .eq('id', buku.id)
      }

      // 2. Update activity records to approved
      await supabase
        .from('activity_records')
        .update({ status: 'approved' })
        .eq('user_id', buku.user_id)
        .eq('bulan', buku.bulan)
        .eq('tahun', buku.tahun)

      setSigningId(null)
      clearSignature()
      await loadApprovals()
    } catch (err) {
      console.error(err)
      alert('Gagal menyetujui dokumen')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (bukuId: string) => {
    if (!confirm('Kembalikan dokumen ini ke draft?')) return
    try {
      await supabase.from('buku_kendali').update({ status: 'draft' }).eq('id', bukuId)
      const buku = pendingApprovals.find(b => b.id === bukuId) || approvedRecords.find(b => b.id === bukuId)
      if (buku) {
        await supabase.from('activity_records')
          .update({ status: 'draft' })
          .eq('user_id', buku.user_id)
          .eq('bulan', buku.bulan)
          .eq('tahun', buku.tahun)
      }
      await loadApprovals()
    } catch (err) {
      console.error(err)
      alert('Gagal menolak dokumen')
    }
  }

  const handleCancelApproval = async (bukuId: string) => {
    if (!confirm('Batalkan persetujuan dokumen ini? Status akan kembali menjadi "Menunggu Persetujuan".')) return
    try {
      await supabase.from('buku_kendali')
        .update({
          status: 'submitted',
          approved_by: null,
          approved_at: null,
          secretary_signature: null,
          secretary_name: null,
          secretary_nip: null,
          signed_at: null,
        })
        .eq('id', bukuId)
      
      const buku = approvedRecords.find(b => b.id === bukuId)
      if (buku) {
        await supabase.from('activity_records')
          .update({ status: 'submitted' })
          .eq('user_id', buku.user_id)
          .eq('bulan', buku.bulan)
          .eq('tahun', buku.tahun)
      }
      await loadApprovals()
    } catch (err) {
      console.error(err)
      alert('Gagal membatalkan persetujuan')
    }
  }

  const handleDeleteBuku = async (bukuId: string) => {
    if (!confirm('Hapus persetujuan berkas ini? Seluruh berkas buku kendali terpilih akan dihapus dan aktivitas staff akan dikembalikan ke draft.')) return
    try {
      const buku = approvedRecords.find(b => b.id === bukuId)
      if (buku) {
        await supabase.from('activity_records')
          .update({ status: 'draft' })
          .eq('user_id', buku.user_id)
          .eq('bulan', buku.bulan)
          .eq('tahun', buku.tahun)
      }
      await supabase.from('buku_kendali').delete().eq('id', bukuId)
      await loadApprovals()
    } catch (err) {
      console.error(err)
      alert('Gagal menghapus berkas')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!['secretary', 'head', 'admin'].includes(userRole || '')) {
    return (
      <div className="p-8 text-center text-gray-500">
        Anda tidak memiliki akses untuk melihat halaman ini.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Persetujuan Laporan</h1>
        <p className="text-gray-600 mt-1">Review dan tandatangani buku kendali bulanan yang diajukan oleh staff</p>
      </div>

      {/* === PENDING === */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Menunggu Persetujuan</h2>
        {pendingApprovals.length === 0 ? (
          <p className="text-gray-500 text-sm italic">Tidak ada buku kendali yang menunggu persetujuan.</p>
        ) : (
          pendingApprovals.map(buku => (
            <Card key={buku.id} className="border-l-4 border-l-amber-500">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{buku.userName}</h3>
                    <p className="text-sm text-gray-500">
                      Sub bagian / jabatan: {buku.userUnitKerja || buku.userJabatan || '—'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Bulan: <strong className="text-stone-700">{MONTHS[buku.bulan - 1]} {buku.tahun}</strong> — {buku.records.length} catatan
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewId(previewId === buku.id ? null : buku.id)}
                      className="gap-1"
                    >
                      {previewId === buku.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {previewId === buku.id ? 'Tutup' : 'Lihat'}
                    </Button>
                    <Button
                      onClick={() => {
                        const nextId = signingId === buku.id ? null : buku.id
                        setSigningId(nextId)
                        clearSignature()
                        if (nextId) {
                          setJumlahHariKerjaInput(prev => ({
                            ...prev,
                            [buku.id]: buku.jumlah_hari_kerja || ''
                          }))
                        }
                      }}
                      className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      <PenLine className="w-4 h-4" />
                      Tanda Tangan
                    </Button>
                  </div>
                </div>

                {/* Document preview panel */}
                {previewId === buku.id && (
                  <div className="border rounded-lg overflow-hidden mt-4">
                    <SKPTemplate
                      profile={{
                        full_name: buku.userName,
                        nip: buku.userNip,
                        pangkat: buku.userPangkat,
                        jabatan: buku.userJabatan,
                        unit_kerja: buku.userUnitKerja,
                        nama_atasan: buku.userNamaAtasan,
                        nip_atasan: buku.userNipAtasan,
                        jabatan_atasan: buku.userJabatanAtasan,
                      } as any}
                      records={buku.records}
                      bulan={buku.bulan}
                      tahun={buku.tahun}
                      showPrint={false}
                      signature={{
                        user_signature: buku.user_signature,
                        nilai: buku.nilai,
                        jumlah_hari_kerja: buku.jumlah_hari_kerja,
                      }}
                    />
                  </div>
                )}

                {/* Signature panel */}
                {signingId === buku.id && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                      <PenLine className="w-4 h-4" />
                      Tanda Tangan Digital Atasan
                    </h3>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 mb-1">Nama Penyetuju</p>
                        <p className="font-medium">{secretaryProfile.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">NIP</p>
                        <p className="font-medium">{secretaryProfile.nip || '—'}</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">
                      Nama dan NIP diambil dari{' '}
                      <a href="/dashboard/profile" className="text-blue-600 underline">profil Anda</a>.
                    </p>

                    {/* Unique Approved Days Info */}
                    {(() => {
                      const uniqueAccDates = new Set(buku.records.filter(r => r.status === 'submitted' || r.status === 'approved').map(r => r.tanggal))
                      const jumlahHariKerjaAcc = uniqueAccDates.size
                      const inputHariKerja = jumlahHariKerjaInput[buku.id] ?? ''
                      const calculatedNilai = (typeof inputHariKerja === 'number' && inputHariKerja > 0)
                        ? Math.round((jumlahHariKerjaAcc / inputHariKerja) * 100)
                        : 0

                      return (
                        <div className="space-y-3 bg-white p-3 rounded-md border border-stone-200 shadow-sm max-w-xs mt-3 mb-2">
                          <div>
                            <span className="text-xs font-semibold text-stone-500 uppercase block">Hari Kerja di ACC</span>
                            <span className="text-sm font-bold text-stone-800">{jumlahHariKerjaAcc} Hari</span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-stone-700 block uppercase">
                              Jumlah Hari Kerja <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={jumlahHariKerjaInput[buku.id] ?? ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value)
                                setJumlahHariKerjaInput(prev => ({
                                  ...prev,
                                  [buku.id]: isNaN(val) ? '' : Math.min(31, Math.max(1, val))
                                }))
                              }}
                              placeholder="Input Jumlah Hari..."
                              className="w-full h-9 px-3 py-1 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-stone-900"
                              required
                            />
                          </div>

                          <div className="pt-2 border-t border-stone-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-stone-600 uppercase">Nilai Kinerja:</span>
                            <span className="text-sm font-extrabold text-blue-700">{calculatedNilai}%</span>
                          </div>
                        </div>
                      )
                    })()}

                    <div className="flex bg-stone-200 p-0.5 rounded-md text-xs font-medium max-w-xs mb-1">
                      {secretaryProfile.signature && (
                        <button
                          type="button"
                          onClick={() => setSignMethod('profile')}
                          className={`flex-1 py-1 rounded-md transition-all ${
                            signMethod === 'profile' ? 'bg-white shadow text-stone-900 font-semibold' : 'text-stone-500 hover:text-stone-900'
                          }`}
                        >
                          Tanda Tangan Profil
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSignMethod('draw')}
                        className={`flex-1 py-1 rounded-md transition-all ${
                          signMethod === 'draw' ? 'bg-white shadow text-stone-900 font-semibold' : 'text-stone-500 hover:text-stone-900'
                        }`}
                      >
                        Tanda Tangan Manual
                      </button>
                    </div>

                    {/* TAB CONTENT: PROFILE */}
                    {signMethod === 'profile' && secretaryProfile.signature && (
                      <div className="border border-stone-200 rounded-lg p-3 bg-white text-center max-w-md">
                        <p className="text-xs text-stone-500 mb-2">Menggunakan tanda tangan dari profil Anda:</p>
                        <div className="bg-white border rounded p-2 flex justify-center items-center h-28">
                          <img
                            src={secretaryProfile.signature}
                            alt="Tanda Tangan Profil"
                            className="max-h-24 object-contain"
                          />
                        </div>
                      </div>
                    )}

                    {/* TAB CONTENT: DRAW */}
                    {signMethod === 'draw' && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Gambar Tanda Tangan:</p>
                        <div className="border-2 border-dashed border-blue-300 rounded-lg p-2 bg-white max-w-md">
                          <canvas
                            ref={canvasRef}
                            width={500}
                            height={120}
                            className="w-full bg-white rounded cursor-crosshair touch-none"
                            style={{ touchAction: 'none' }}
                            onMouseDown={startDraw}
                            onMouseMove={draw}
                            onMouseUp={stopDraw}
                            onMouseLeave={stopDraw}
                            onTouchStart={startDraw}
                            onTouchMove={draw}
                            onTouchEnd={stopDraw}
                          />
                          <p className="text-xs text-gray-400 text-center mt-1">
                            Gambar tanda tangan Anda di sini
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={clearSignature} className="gap-1">
                          <Eraser className="w-3.5 h-3.5" />
                          Hapus
                        </Button>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={async () => {
                          const uniqueAccDates = new Set(buku.records.filter(r => r.status === 'submitted' || r.status === 'approved').map(r => r.tanggal))
                          const jumlahHariKerjaAcc = uniqueAccDates.size
                          const inputHariKerja = jumlahHariKerjaInput[buku.id]
                          if (inputHariKerja === undefined || inputHariKerja === '' || inputHariKerja < 1) {
                            alert('Silakan masukkan jumlah hari kerja terlebih dahulu')
                            return
                          }
                          const score = Math.round((jumlahHariKerjaAcc / Number(inputHariKerja)) * 100)
                          let finalSign = ''
                          if (signMethod === 'profile') {
                            finalSign = secretaryProfile.signature || ''
                          } else if (signMethod === 'draw') {
                            if (canvasRef.current) {
                              finalSign = canvasRef.current.toDataURL('image/png')
                            }
                          }
                          await handleApprove(buku, finalSign, score, Number(inputHariKerja))
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Tanda Tangan & Setujui
                      </Button>
                      <Button
                        onClick={() => handleReject(buku.id)}
                        variant="outline"
                        className="flex-1 gap-2 border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Kembalikan
                      </Button>
                      <Button variant="ghost" onClick={() => setSigningId(null)}>
                        Batal
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* === APPROVED === */}
      {approvedRecords.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Sudah Ditandatangani</h2>
          <div className="grid gap-4">
            {approvedRecords.map(buku => (
              <Card key={buku.id} className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <p className="font-semibold text-base">{buku.userName}</p>
                      <p className="text-sm text-gray-500">
                        {MONTHS[buku.bulan - 1]} {buku.tahun} — {buku.records.length} catatan
                      </p>
                      {buku.nilai !== undefined && buku.nilai !== null && (
                        <p className="text-xs text-stone-600 mt-1 font-semibold">
                          Nilai Kinerja: <span className="text-green-700">{buku.nilai} / 100</span>
                        </p>
                      )}
                      {buku.signed_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          Ditandatangani: {new Date(buku.signed_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                          {buku.secretary_name && ` oleh ${buku.secretary_name}`}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewId(previewId === buku.id ? null : buku.id)}
                        className="gap-1 text-gray-700"
                      >
                        {previewId === buku.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {previewId === buku.id ? 'Tutup' : 'Lihat Dokumen'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelApproval(buku.id)}
                        className="gap-1 text-amber-700 hover:text-amber-800 border-amber-200 hover:bg-amber-50"
                        title="Batalkan persetujuan untuk mengubah tanda tangan atau detail"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit/Batal
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(buku.id)}
                        className="gap-1 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                        title="Kembalikan laporan ini ke staff (Tolak)"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Tolak
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteBuku(buku.id)}
                        className="gap-1 text-stone-600 hover:text-stone-700 border-stone-200 hover:bg-stone-50"
                        title="Hapus berkas persetujuan"
                      >
                        <Trash2 className="w-4 h-4" />
                        Hapus
                      </Button>
                    </div>
                  </div>

                  {previewId === buku.id && (
                    <div className="mt-4 border rounded-lg overflow-hidden">
                      <SKPTemplate
                        profile={{
                          full_name: buku.userName,
                          nip: buku.userNip,
                          pangkat: buku.userPangkat,
                          jabatan: buku.userJabatan,
                          unit_kerja: buku.userUnitKerja,
                          nama_atasan: buku.userNamaAtasan,
                          nip_atasan: buku.userNipAtasan,
                          jabatan_atasan: buku.userJabatanAtasan,
                        } as any}
                        records={buku.records}
                        bulan={buku.bulan}
                        tahun={buku.tahun}
                        signature={{
                          secretary_name: buku.secretary_name,
                          secretary_nip: buku.secretary_nip,
                          secretary_signature: buku.secretary_signature,
                          signed_at: buku.signed_at,
                          user_signature: buku.user_signature,
                          nilai: buku.nilai,
                          jumlah_hari_kerja: buku.jumlah_hari_kerja,
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
