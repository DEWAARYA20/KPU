'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SKPTemplate } from '@/components/skp-template'
import { CheckCircle, XCircle, Eye, EyeOff, Eraser, PenLine } from 'lucide-react'

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
  userName: string
  userNip: string
  userJabatan: string
  userPangkat: string
  userUnitKerja: string
  userNamaAtasan: string
  userNipAtasan: string
  userJabatanAtasan: string
  records: ActivityRecord[]
}

const MONTHS = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER',
]

export default function ApprovalsPage() {
  const [pendingApprovals, setPendingApprovals] = useState<BukuKendali[]>([])
  const [approvedRecords, setApprovedRecords] = useState<BukuKendali[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [secretaryProfile, setSecretaryProfile] = useState({ name: '', nip: '' })
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [signingId, setSigningId] = useState<string | null>(null)

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
      const isSupervisorUnit = profile.unit_kerja?.startsWith('Kepala')
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

      if (role === 'staff' && (isSupervisorUnit || isSupervisorNip)) {
        role = 'head'
      }

      if (!['secretary', 'head', 'admin'].includes(role)) return

      setUserRole(role)
      setSecretaryProfile({
        name: profile.full_name || '',
        nip: profile.nip || '',
      })

      // Load pending buku_kendali with user profiles
      const { data: bukuData } = await supabase
        .from('buku_kendali')
        .select(`id, user_id, bulan, tahun, status, approved_at, secretary_name, secretary_nip, secretary_signature, signed_at, profiles!user_id(full_name, nip, jabatan, pangkat, unit_kerja, nama_atasan, nip_atasan, jabatan_atasan)`)
        .in('status', ['submitted', 'approved'])
        .order('tahun', { ascending: false })

      if (!bukuData) return

      const enriched: BukuKendali[] = []

      for (const buku of bukuData) {
        const p = (buku.profiles as any) || {}
        
        // If not admin, only show subordinates whose nip_atasan matches this supervisor's NIP
        if (role !== 'admin' && p.nip_atasan !== profile.nip) {
          continue
        }

        // Load records for this user/month/year
        const { data: recs } = await supabase
          .from('activity_records')
          .select('*')
          .eq('user_id', buku.user_id)
          .eq('bulan', buku.bulan)
          .eq('tahun', buku.tahun)
          .order('tanggal')

        enriched.push({
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
          userName: p.full_name || 'Unknown',
          userNip: p.nip || '',
          userJabatan: p.jabatan || '',
          userPangkat: p.pangkat || '',
          userUnitKerja: p.unit_kerja || '',
          userNamaAtasan: p.nama_atasan || '',
          userNipAtasan: p.nip_atasan || '',
          userJabatanAtasan: p.jabatan_atasan || '',
          records: recs || [],
        })
      }

      setPendingApprovals(enriched.filter(b => b.status === 'submitted'))
      setApprovedRecords(enriched.filter(b => b.status === 'approved'))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Canvas drawing helpers
  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!canvasRef.current) return
    setIsDrawing(true)
    setLastPos(getPos(e, canvasRef.current))
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvasRef.current)
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
    if (!canvasRef.current) return
    canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  const handleApprove = async (buku: BukuKendali) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get signature image from canvas
      const signatureImg = canvasRef.current?.toDataURL('image/png') || ''

      const now = new Date().toISOString()
      const { error } = await supabase.from('buku_kendali').update({
        status: 'approved',
        approved_by: user.id,
        approved_at: now,
        secretary_name: secretaryProfile.name,
        secretary_nip: secretaryProfile.nip,
        secretary_signature: signatureImg,
        signed_at: now,
      }).eq('id', buku.id)

      if (error) throw error

      // Update activity records to approved
      await supabase.from('activity_records')
        .update({ status: 'approved' })
        .eq('user_id', buku.user_id)
        .eq('bulan', buku.bulan)
        .eq('tahun', buku.tahun)

      // Add to approval history
      await supabase.from('approval_history').insert([{
        buku_kendali_id: buku.id,
        approved_by: user.id,
        status: 'approved',
      }]).then(() => {})

      setSigningId(null)
      clearSignature()
      await loadApprovals()
    } catch (err) {
      console.error(err)
      alert('Gagal menyetujui dokumen')
    }
  }

  const handleReject = async (bukuId: string) => {
    if (!confirm('Kembalikan dokumen ini ke draft?')) return
    try {
      await supabase.from('buku_kendali').update({ status: 'draft' }).eq('id', bukuId)
      const buku = pendingApprovals.find(b => b.id === bukuId)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!userRole) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Anda tidak memiliki akses ke halaman ini.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Persetujuan Laporan Kinerja</h1>
        <p className="text-gray-600 mt-1">Review dan tanda tangani laporan kinerja harian staff</p>
      </div>

      {/* === PENDING === */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Menunggu Tanda Tangan
          {pendingApprovals.length > 0 && (
            <span className="ml-2 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-sm">
              {pendingApprovals.length}
            </span>
          )}
        </h2>

        {pendingApprovals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Tidak ada laporan yang menunggu persetujuan
            </CardContent>
          </Card>
        ) : (
          pendingApprovals.map(buku => (
            <Card key={buku.id} className="border-l-4 border-l-yellow-400">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{buku.userName}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {buku.userJabatan} — {MONTHS[buku.bulan - 1]} {buku.tahun}
                    </p>
                    <p className="text-xs text-gray-400">NIP: {buku.userNip} • {buku.records.length} catatan</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewId(previewId === buku.id ? null : buku.id)}
                      className="gap-1"
                    >
                      {previewId === buku.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {previewId === buku.id ? 'Tutup' : 'Preview'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setSigningId(signingId === buku.id ? null : buku.id)}
                      className="gap-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <PenLine className="w-4 h-4" />
                      Tanda Tangan
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Preview template */}
                {previewId === buku.id && (
                  <div className="border rounded-lg overflow-hidden">
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
                      }}
                      records={buku.records}
                      bulan={buku.bulan}
                      tahun={buku.tahun}
                      showPrint={false}
                    />
                  </div>
                )}

                {/* Signature panel */}
                {signingId === buku.id && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                      <PenLine className="w-4 h-4" />
                      Tanda Tangan Digital
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

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Gambar Tanda Tangan:</p>
                      <div className="border-2 border-dashed border-blue-300 rounded-lg p-2 bg-white">
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

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={() => handleApprove(buku)}
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
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{buku.userName}</p>
                      <p className="text-sm text-gray-500">
                        {MONTHS[buku.bulan - 1]} {buku.tahun} — {buku.records.length} catatan
                      </p>
                      {buku.signed_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          Ditandatangani: {new Date(buku.signed_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                          {buku.secretary_name && ` oleh ${buku.secretary_name}`}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewId(previewId === buku.id ? null : buku.id)}
                      className="gap-1"
                    >
                      {previewId === buku.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {previewId === buku.id ? 'Tutup' : 'Lihat Dokumen'}
                    </Button>
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
                        }}
                        records={buku.records}
                        bulan={buku.bulan}
                        tahun={buku.tahun}
                        signature={{
                          secretary_name: buku.secretary_name,
                          secretary_nip: buku.secretary_nip,
                          secretary_signature: buku.secretary_signature,
                          signed_at: buku.signed_at,
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
