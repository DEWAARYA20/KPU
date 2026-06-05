'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SKPTemplate } from '@/components/skp-template'
import { BukuKendaliTemplate } from '@/components/buku-kendali-template'
import { Send, CheckCircle2, Clock, FileText, Pencil, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface ActivityRecord {
  id: string
  tanggal: string
  hari: string
  uraian_kegiatan: string
  output_hasil: string
  status: 'draft' | 'submitted' | 'approved'
  bulan: number
  tahun: number
}

interface BukuKendali {
  id: string
  bulan: number
  tahun: number
  status: 'draft' | 'submitted' | 'approved'
  secretary_name?: string
  secretary_nip?: string
  secretary_signature?: string
  signed_at?: string
  user_signature?: string
  nilai?: number
  jumlah_hari_kerja?: number
}

interface UserProfile {
  id?: string
  full_name: string
  nip: string
  pangkat: string
  jabatan: string
  unit_kerja: string
  nama_atasan?: string
  nip_atasan?: string
  jabatan_atasan?: string
  skp_items?: string[]
  signature?: string
  role?: string
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const MONTHS_SHORT = [
  'JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN',
  'JUL', 'AGT', 'SEP', 'OKT', 'NOV', 'DES',
]

const STATUS_INFO = {
  draft:     { label: 'Draft',                  color: 'bg-gray-100 text-gray-700',   icon: FileText },
  submitted: { label: 'Menunggu Persetujuan',   color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved:  { label: 'Disetujui',              color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
}

const formatIndonesianDateRange = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return ''
  const monthsIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  const startDate = new Date(startStr)
  const endDate = new Date(endStr)

  const startDay = startDate.getDate()
  const startMonth = monthsIndo[startDate.getMonth()]
  const startYear = startDate.getFullYear()

  const endDay = endDate.getDate()
  const endMonth = monthsIndo[endDate.getMonth()]
  const endYear = endDate.getFullYear()

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      if (startDay === endDay) {
        return `${String(startDay).padStart(2, '0')} ${startMonth} ${startYear}`
      }
      return `${String(startDay).padStart(2, '0')} - ${String(endDay).padStart(2, '0')} ${startMonth} ${startYear}`
    }
    return `${String(startDay).padStart(2, '0')} ${startMonth} - ${String(endDay).padStart(2, '0')} ${endMonth} ${startYear}`
  }
  return `${String(startDay).padStart(2, '0')} ${startMonth} ${startYear} - ${String(endDay).padStart(2, '0')} ${endMonth} ${endYear}`
}

const getDefaultDatesForMonth = (monthIndex: number, year: number) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  const startDateStr = `${year}-${pad(monthIndex + 1)}-01`
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const endDateStr = `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`
  return { startDateStr, endDateStr }
}

export default function BukuKendaliPage() {
  const [records, setRecords]         = useState<Record<number, ActivityRecord[]>>({})
  const [bukuKendali, setBukuKendali] = useState<Record<number, BukuKendali>>({})
  const [profile, setProfile]         = useState<UserProfile>({
    full_name: '', nip: '', pangkat: '', jabatan: '',
    unit_kerja: '', nama_atasan: '', nip_atasan: '', jabatan_atasan: '',
  })
  
  // Admin overview states
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([])
  const [allBukuKendali, setAllBukuKendali] = useState<any[]>([])
  const [adminMonth, setAdminMonth] = useState(new Date().getMonth())
  const [adminSearch, setAdminSearch] = useState('')
  const [adminPeriodType, setAdminPeriodType] = useState<'monthly' | 'custom'>('monthly')
  const [adminStartDate, setAdminStartDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [adminEndDate, setAdminEndDate] = useState(() => {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  })
  const [selectedAdminUser, setSelectedAdminUser] = useState<UserProfile | null>(null)
  const [adminUserRecords, setAdminUserRecords] = useState<ActivityRecord[]>([])
  const [adminUserBuku, setAdminUserBuku] = useState<BukuKendali | null>(null)
  const [isAdminDetailOpen, setIsAdminDetailOpen] = useState(false)
  const [loadingAdminDetail, setLoadingAdminDetail] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState<number | null>(null)
  const [reportMonth, setReportMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  // coverMonth: which month is shown on the cover (0-indexed), default = current month
  const [coverMonth, setCoverMonth] = useState(new Date().getMonth())

  // Cover custom date range states
  const [coverPeriodType, setCoverPeriodType] = useState<'monthly' | 'custom'>('monthly')
  const [coverStartDate, setCoverStartDate] = useState('')
  const [coverEndDate, setCoverEndDate] = useState('')

  // Report custom date range states
  const [reportPeriodType, setReportPeriodType] = useState<'monthly' | 'custom'>('monthly')
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')

  const supabase = createClient()

  // Signature canvas states
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  const [isSignOpen, setIsSignOpen] = useState(false)
  const [monthToSign, setMonthToSign] = useState<number | null>(null)
  const [signMethod, setSignMethod] = useState<'profile' | 'draw' | 'upload'>('draw')
  const [uploadedSign, setUploadedSign] = useState('')

  // CRUD state
  const [editingRecord, setEditingRecord] = useState<ActivityRecord | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ tanggal: '', hari: '', uraian_kegiatan: '', output_hasil: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  // CRUD helpers
  const getDayName = (dateStr: string) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const d = new Date(dateStr + 'T00:00:00')
    return days[d.getDay()]
  }

  const refreshRecords = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: activities } = await supabase
      .from('activity_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('tahun', selectedYear)
      .order('tanggal', { ascending: true })
    const grouped: Record<number, ActivityRecord[]> = {}
    if (activities) {
      activities.forEach(r => {
        const m = r.bulan - 1
        if (!grouped[m]) grouped[m] = []
        grouped[m].push(r)
      })
    }
    setRecords(grouped)
  }

  const openEditRecord = (record: ActivityRecord) => {
    setEditingRecord(record)
    setEditForm({
      tanggal: record.tanggal,
      hari: record.hari,
      uraian_kegiatan: record.uraian_kegiatan,
      output_hasil: record.output_hasil,
    })
    setIsEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingRecord) return
    setSavingEdit(true)
    try {
      const hari = getDayName(editForm.tanggal)
      const { error } = await supabase
        .from('activity_records')
        .update({
          tanggal: editForm.tanggal,
          hari,
          uraian_kegiatan: editForm.uraian_kegiatan,
          output_hasil: editForm.output_hasil,
        })
        .eq('id', editingRecord.id)
      if (error) throw error
      await refreshRecords()
      setIsEditOpen(false)
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan perubahan')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Yakin ingin menghapus catatan ini? Tindakan ini tidak dapat dibatalkan.')) return
    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('activity_records')
        .delete()
        .eq('id', id)
      if (error) throw error
      await refreshRecords()
    } catch (err) {
      console.error(err)
      alert('Gagal menghapus catatan')
    } finally {
      setDeletingId(null)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      if (profileData) setProfile(profileData as UserProfile)

      const { data: activities } = await supabase
        .from('activity_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('tahun', selectedYear)
        .order('tanggal', { ascending: true })

      const grouped: Record<number, ActivityRecord[]> = {}
      if (activities) {
        activities.forEach(r => {
          const m = r.bulan - 1
          if (!grouped[m]) grouped[m] = []
          grouped[m].push(r)
        })
      }
      setRecords(grouped)

      const { data: bukuData } = await supabase
        .from('buku_kendali')
        .select('*')
        .eq('user_id', user.id)
        .eq('tahun', selectedYear)

      const bukuMap: Record<number, BukuKendali> = {}
      if (bukuData) {
        bukuData.forEach(b => { bukuMap[b.bulan - 1] = b })
      }
      setBukuKendali(bukuMap)
      setLoading(false)
    }
    load()
  }, [supabase, selectedYear])

  const loadAdminData = async () => {
    try {
      const { data: pData } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true })
      if (pData) setAllProfiles(pData as UserProfile[])

      const { data: bkData } = await supabase
        .from('buku_kendali')
        .select('*')
        .eq('bulan', adminMonth + 1)
        .eq('tahun', selectedYear)
      if (bkData) setAllBukuKendali(bkData)
    } catch (err) {
      console.error('Error loading admin data:', err)
    }
  }

  useEffect(() => {
    if (profile.role === 'admin') {
      loadAdminData()
    }
  }, [profile.role, adminMonth, selectedYear])

  const handleViewUserRekap = async (userProfile: UserProfile) => {
    setLoadingAdminDetail(true)
    setSelectedAdminUser(userProfile)
    setIsAdminDetailOpen(true)
    try {
      const existingBuku = allBukuKendali.find(b => b.user_id === userProfile.id)
      setAdminUserBuku(existingBuku || null)

      const { data: recordsData } = await supabase
        .from('activity_records')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('bulan', adminMonth + 1)
        .eq('tahun', selectedYear)
        .order('tanggal', { ascending: true })

      setAdminUserRecords(recordsData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingAdminDetail(false)
    }
  }

  const handleSubmitForApproval = async (monthIndex: number, signatureBase64: string) => {
    setSubmitting(monthIndex)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const bulan = monthIndex + 1
      const monthRecords = records[monthIndex] || []
      if (monthRecords.length === 0) {
        alert('Tidak ada catatan untuk bulan ini')
        return
      }

      const draftIds = monthRecords.filter(r => r.status === 'draft').map(r => r.id)
      if (draftIds.length > 0) {
        await supabase.from('activity_records')
          .update({ status: 'submitted' }).in('id', draftIds)
      }

      const existing = bukuKendali[monthIndex]
      if (existing) {
        await supabase.from('buku_kendali')
          .update({ 
            status: 'submitted',
            user_signature: signatureBase64
          }).eq('id', existing.id)
      } else {
        await supabase.from('buku_kendali').insert([{
          user_id: user.id, 
          bulan, 
          tahun: selectedYear, 
          status: 'submitted',
          user_signature: signatureBase64
        }])
      }

      // Refresh
      const { data: activities } = await supabase
        .from('activity_records').select('*')
        .eq('user_id', user.id).eq('tahun', selectedYear).order('tanggal')
      const grouped: Record<number, ActivityRecord[]> = {}
      if (activities) activities.forEach(r => {
        const m = r.bulan - 1
        if (!grouped[m]) grouped[m] = []
        grouped[m].push(r)
      })
      setRecords(grouped)

      const { data: bukuData } = await supabase
        .from('buku_kendali').select('*')
        .eq('user_id', user.id).eq('tahun', selectedYear)
      const bukuMap: Record<number, BukuKendali> = {}
      if (bukuData) bukuData.forEach(b => { bukuMap[b.bulan - 1] = b })
      setBukuKendali(bukuMap)
    } catch (err) {
      console.error(err)
      alert('Gagal mengajukan persetujuan')
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#7a0000' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rekap Bulanan SKP</h1>
          <p className="text-gray-600 mt-1">Buku Kendali & Laporan Kinerja Harian</p>
        </div>
        <Select value={`${selectedYear}`} onValueChange={v => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={`${y}`}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue={profile.role === 'admin' ? "admin-rekap" : "cover"} className="w-full">
        {/* Tab list: COVER + LAPORAN */}
        <TabsList className="flex flex-wrap h-auto gap-1 justify-start bg-gray-100 p-1 rounded-lg">
          {profile.role === 'admin' && (
            <TabsTrigger
              value="admin-rekap"
              className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-red-800 data-[state=active]:text-white"
            >
              REKAP SEMUA PEGAWAI
            </TabsTrigger>
          )}
          {/* COVER tab */}
          <TabsTrigger
            value="cover"
            className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-green-500 data-[state=active]:text-white"
          >
            {profile.role === 'admin' ? 'COVER SAYA' : 'COVER'}
          </TabsTrigger>

          {/* LAPORAN tab */}
          <TabsTrigger
            value="laporan"
            className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-white"
          >
            {profile.role === 'admin' ? 'LAPORAN SAYA' : 'LAPORAN'}
          </TabsTrigger>
        </TabsList>

        {/* COVER Tab Content */}
        <TabsContent value="cover" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-4 mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-stone-700">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Tipe Periode</label>
              <div className="flex bg-gray-100 p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => setCoverPeriodType('monthly')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    coverPeriodType === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => setCoverPeriodType('custom')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    coverPeriodType === 'custom' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Rentang Tanggal
                </button>
              </div>
            </div>

            {coverPeriodType === 'monthly' ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Pilih Bulan</label>
                <Select
                  value={`${coverMonth}`}
                  onValueChange={v => setCoverMonth(parseInt(v))}
                >
                  <SelectTrigger className="w-44 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={`${i}`}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={coverStartDate}
                    onChange={e => setCoverStartDate(e.target.value)}
                    className="h-9 w-40 px-3 py-1 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={coverEndDate}
                    onChange={e => setCoverEndDate(e.target.value)}
                    className="h-9 w-40 px-3 py-1 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </>
            )}
          </div>

          {profile.full_name ? (
            <BukuKendaliTemplate
              data={{
                nama: profile.full_name,
                nip: profile.nip,
                pangkat: profile.pangkat,
                jabatan: profile.jabatan,
                bulan: coverMonth + 1,
                tahun: selectedYear,
                institusi: 'Sekretariat KPU Kota Palu',
                periodeText: coverPeriodType === 'custom' ? formatIndonesianDateRange(coverStartDate, coverEndDate) : undefined,
              }}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <p className="text-gray-500">Profil Anda belum lengkap.</p>
                <p className="text-sm text-gray-400">
                  Silakan isi data diri di halaman{' '}
                  <a href="/dashboard/profile" className="text-blue-600 underline">
                    Profil Saya
                  </a>{' '}
                  agar cover buku kendali dapat ditampilkan.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* LAPORAN Tab Content */}
        {(() => {
          const monthRecords = records[reportMonth] || []

          // Filter records if Rentang Tanggal is active
          const isCustomPeriod = reportPeriodType === 'custom'
          const filteredRecords = isCustomPeriod && reportStartDate && reportEndDate
            ? monthRecords.filter(r => r.tanggal >= reportStartDate && r.tanggal <= reportEndDate)
            : monthRecords

          const buku = bukuKendali[reportMonth]
          const status = buku?.status || 'draft'
          const StatusInfo = STATUS_INFO[status as keyof typeof STATUS_INFO]
          const StatusIcon = StatusInfo.icon
          const hasDrafts = monthRecords.some(r => r.status === 'draft')

          const customPeriodText = isCustomPeriod && reportStartDate && reportEndDate
            ? formatIndonesianDateRange(reportStartDate, reportEndDate)
            : undefined

          return (
            <TabsContent value="laporan" className="space-y-4 mt-4">
              {/* Month Selector */}
              <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-stone-700">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Pilih Bulan</label>
                  <Select
                    value={`${reportMonth}`}
                    onValueChange={v => {
                      setReportMonth(parseInt(v))
                      setReportPeriodType('monthly')
                      setReportStartDate('')
                      setReportEndDate('')
                    }}
                  >
                    <SelectTrigger className="w-44 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={`${i}`}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${StatusInfo.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {StatusInfo.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {filteredRecords.length} catatan — {MONTHS[reportMonth]} {selectedYear}
                  </span>
                </div>

                {(status === 'draft' || hasDrafts) && monthRecords.length > 0 && (
                  <Button
                    onClick={() => {
                      setMonthToSign(reportMonth)
                      setSignMethod(profile.signature ? 'profile' : 'draw')
                      setUploadedSign('')
                      setIsSignOpen(true)
                    }}
                    disabled={submitting === reportMonth}
                    className="gap-2"
                    style={{ background: '#7a0000', color: '#fff' }}
                  >
                    <Send className="w-4 h-4" />
                    {submitting === reportMonth ? 'Mengajukan...' : 'Ajukan Persetujuan'}
                  </Button>
                )}

                {status === 'approved' && (
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Sudah ditandatangani
                  </span>
                )}
              </div>

              {/* Date Filter for Report */}
              <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-stone-700">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Periode Laporan</label>
                  <div className="flex bg-gray-100 p-0.5 rounded-md">
                    <button
                      type="button"
                      onClick={() => setReportPeriodType('monthly')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        reportPeriodType === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Seluruh Bulan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const { startDateStr, endDateStr } = getDefaultDatesForMonth(reportMonth, selectedYear)
                        setReportPeriodType('custom')
                        setReportStartDate(s => s || startDateStr)
                        setReportEndDate(s => s || endDateStr)
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        reportPeriodType === 'custom' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Rentang Tanggal
                    </button>
                  </div>
                </div>

                {reportPeriodType === 'custom' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Tanggal Mulai</label>
                      <input
                        type="date"
                        value={reportStartDate}
                        onChange={e => setReportStartDate(e.target.value)}
                        className="h-9 w-40 px-3 py-1 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Tanggal Selesai</label>
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={e => setReportEndDate(e.target.value)}
                        className="h-9 w-40 px-3 py-1 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Kelola Catatan — CRUD Table */}
              {monthRecords.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-stone-800">
                      Daftar Catatan — {MONTHS[reportMonth]} {selectedYear}
                    </h3>
                    <span className="text-xs text-gray-400">{filteredRecords.length} catatan ditampilkan</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-left">
                          <th className="px-3 py-2 text-xs font-semibold text-gray-500 w-8 align-middle">No</th>
                          <th className="px-3 py-2 text-xs font-semibold text-gray-500 whitespace-nowrap align-middle">Tanggal</th>
                          <th className="px-3 py-2 text-xs font-semibold text-gray-500 align-middle">Uraian Kegiatan</th>
                          <th className="px-3 py-2 text-xs font-semibold text-gray-500 align-middle">Output / Hasil</th>
                          <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-center align-middle">Status</th>
                          <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-center align-middle">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.map((record, idx) => (
                          <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                            <td className="px-3 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap text-xs">
                              {record.hari},<br />
                              {new Date(record.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </td>
                            <td className="px-3 py-2.5 text-gray-700 text-xs max-w-[240px] break-words whitespace-normal">{record.uraian_kegiatan}</td>
                            <td className="px-3 py-2.5 text-gray-700 text-xs max-w-[180px] break-words whitespace-normal">{record.output_hasil}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                record.status === 'approved' ? 'bg-green-100 text-green-700' :
                                record.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {record.status === 'approved' ? 'Disetujui' :
                                 record.status === 'submitted' ? 'Diajukan' : 'Draft'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openEditRecord(record)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Edit catatan"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(record.id)}
                                  disabled={deletingId === record.id}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40"
                                  title="Hapus catatan"
                                >
                                  {deletingId === record.id
                                    ? <span className="text-xs">...</span>
                                    : <Trash2 className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SKP Template (untuk cetak) */}
              {profile.full_name ? (
                <SKPTemplate
                  profile={profile}
                  records={filteredRecords}
                  bulan={reportMonth + 1}
                  tahun={selectedYear}
                  customPeriodText={customPeriodText}
                  onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)}
                  signature={buku ? {
                    secretary_name: buku.secretary_name,
                    secretary_nip: buku.secretary_nip,
                    secretary_signature: buku.secretary_signature,
                    signed_at: buku.signed_at,
                    user_signature: buku.user_signature,
                    nilai: buku.nilai,
                    jumlah_hari_kerja: buku.jumlah_hari_kerja,
                  } : undefined}
                />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center space-y-3">
                    <p className="text-gray-500">Profil Anda belum lengkap.</p>
                    <p className="text-sm text-gray-400">
                      Silakan isi data diri di halaman{' '}
                      <a href="/dashboard/profile" className="text-blue-600 underline">
                        Profil Saya
                      </a>{' '}
                      agar template laporan dapat ditampilkan.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )
        })()}

        {/* Admin overview tab contents */}
        {profile.role === 'admin' && (
          <TabsContent value="admin-rekap" className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-stone-700">
              <div className="flex flex-wrap items-center gap-4">
                {/* Tipe Periode */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Periode Laporan</label>
                  <div className="flex bg-gray-100 p-0.5 rounded-md">
                    <button
                      type="button"
                      onClick={() => setAdminPeriodType('monthly')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        adminPeriodType === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Seluruh Bulan
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminPeriodType('custom')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        adminPeriodType === 'custom' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Rentang Tanggal
                    </button>
                  </div>
                </div>

                {/* Pilih Bulan atau Rentang Tanggal */}
                {adminPeriodType === 'monthly' ? (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Pilih Bulan</label>
                    <Select
                      value={`${adminMonth}`}
                      onValueChange={v => setAdminMonth(parseInt(v))}
                    >
                      <SelectTrigger className="w-44 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={i} value={`${i}`}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Tanggal Mulai</label>
                      <input
                        type="date"
                        value={adminStartDate}
                        onChange={e => setAdminStartDate(e.target.value)}
                        className="h-9 w-40 px-3 py-1 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-red-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Tanggal Selesai</label>
                      <input
                        type="date"
                        value={adminEndDate}
                        onChange={e => setAdminEndDate(e.target.value)}
                        className="h-9 w-40 px-3 py-1 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-red-800"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="w-full md:w-64 space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Cari Pegawai</label>
                <input
                  type="text"
                  placeholder="Cari nama atau NIP..."
                  value={adminSearch}
                  onChange={e => setAdminSearch(e.target.value)}
                  className="w-full h-9 px-3 py-1 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-red-800 text-stone-900"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden text-stone-900">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-bold text-sm text-stone-800">
                  Rekapitulasi Kinerja Pegawai —{' '}
                  {adminPeriodType === 'custom'
                    ? `${adminStartDate} s/d ${adminEndDate}`
                    : `${MONTHS[adminMonth]} ${selectedYear}`}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-xs font-semibold border-b border-stone-100">
                    <tr>
                      <th className="px-6 py-3">No</th>
                      <th className="px-6 py-3">Nama & NIP</th>
                      <th className="px-6 py-3">Jabatan & Golongan</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3 text-center">Status Laporan</th>
                      <th className="px-6 py-3 text-center">Nilai Kinerja</th>
                      <th className="px-6 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {allProfiles
                      .filter(p => {
                        const searchLower = adminSearch.toLowerCase()
                        return (
                          (p.full_name || '').toLowerCase().includes(searchLower) ||
                          (p.nip || '').includes(searchLower)
                        )
                      })
                      .map((emp, idx) => {
                        const empBuku = allBukuKendali.find(b => b.user_id === emp.id)
                        const status = empBuku?.status || 'none'
                        
                        let statusBadge = (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-500">
                            Belum Ada
                          </span>
                        )
                        if (status === 'draft') {
                          statusBadge = (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              Draft
                            </span>
                          )
                        } else if (status === 'submitted') {
                          statusBadge = (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">
                              Diajukan
                            </span>
                          )
                        } else if (status === 'approved') {
                          statusBadge = (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Disetujui
                            </span>
                          )
                        }

                        let roleBadge = (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            Staf
                          </span>
                        )
                        if (emp.role === 'admin') {
                          roleBadge = (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Admin
                            </span>
                          )
                        } else if (emp.role === 'secretary') {
                          roleBadge = (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Sekretaris
                            </span>
                          )
                        } else if (emp.role === 'head') {
                          roleBadge = (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Atasan
                            </span>
                          )
                        }

                        return (
                          <tr key={emp.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-6 py-3.5 text-stone-400 text-xs font-medium">{idx + 1}</td>
                            <td className="px-6 py-3.5">
                              <div className="font-semibold text-stone-900">{emp.full_name || '—'}</div>
                              <div className="text-xs text-stone-400">NIP. {emp.nip || '—'}</div>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="text-stone-700 font-medium text-xs">{emp.jabatan || '—'}</div>
                              <div className="text-xs text-stone-400">{emp.pangkat || '—'}</div>
                            </td>
                            <td className="px-6 py-3.5">{roleBadge}</td>
                            <td className="px-6 py-3.5 text-center">{statusBadge}</td>
                            <td className="px-6 py-3.5 text-center font-bold">
                              {empBuku?.nilai !== undefined && empBuku?.nilai !== null ? (
                                <span className="text-green-700">{empBuku.nilai}</span>
                              ) : (
                                <span className="text-stone-400 font-normal">—</span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <Button
                                onClick={() => handleViewUserRekap(emp)}
                                size="sm"
                                variant="outline"
                                className="gap-1 hover:bg-stone-100"
                                disabled={status === 'none'}
                              >
                                Lihat Rekap
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
      <Dialog open={isSignOpen} onOpenChange={setIsSignOpen}>
        <DialogContent className="max-w-md bg-white text-stone-900 border border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-700" />
              Tanda Tangan Laporan Kinerja
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <p className="text-sm text-stone-600">
              Silakan bubuhkan tanda tangan Anda sebelum mengirim laporan kinerja ke atasan.
            </p>

            <div className="flex bg-stone-100 p-0.5 rounded-md text-xs font-medium">
              {profile.signature && (
                <button
                  type="button"
                  onClick={() => setSignMethod('profile')}
                  className={`flex-1 py-1.5 rounded-md transition-all ${
                    signMethod === 'profile' ? 'bg-white shadow text-stone-900 animate-fade-in' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Tanda Tangan Profil
                </button>
              )}
              <button
                type="button"
                onClick={() => setSignMethod('draw')}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  signMethod === 'draw' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Tanda Tangan Manual
              </button>
              <button
                type="button"
                onClick={() => setSignMethod('upload')}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  signMethod === 'upload' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Unggah Foto
              </button>
            </div>

            {/* TAB CONTENT: PROFILE */}
            {signMethod === 'profile' && profile.signature && (
              <div className="border border-stone-200 rounded-lg p-3 bg-stone-50 text-center">
                <p className="text-xs text-stone-500 mb-2">Menggunakan tanda tangan dari profil Anda:</p>
                <div className="bg-white border rounded p-2 flex justify-center items-center h-32">
                  <img
                    src={profile.signature}
                    alt="Tanda Tangan Profil"
                    className="max-h-28 object-contain"
                  />
                </div>
              </div>
            )}

            {/* TAB CONTENT: DRAW */}
            {signMethod === 'draw' && (
              <div className="space-y-2">
                <div className="border-2 border-dashed border-stone-300 rounded-lg p-2 bg-stone-50">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={160}
                    className="w-full bg-white rounded cursor-crosshair touch-none border"
                    style={{ touchAction: 'none' }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                  />
                  <p className="text-xs text-stone-400 text-center mt-1">
                    Gambar tanda tangan Anda di atas
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                    Hapus
                  </Button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: UPLOAD */}
            {signMethod === 'upload' && (
              <div className="space-y-3">
                <div className="border border-stone-200 rounded-lg p-4 bg-stone-50 text-center space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    id="sign-upload-input"
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
                    htmlFor="sign-upload-input"
                    className="inline-block px-4 py-2 bg-white border border-stone-300 rounded-md text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer shadow-sm"
                  >
                    Pilih File Gambar Tanda Tangan
                  </label>
                  
                  {uploadedSign ? (
                    <div className="bg-white border rounded p-2 flex justify-center items-center h-32 mt-2">
                      <img
                        src={uploadedSign}
                        alt="Uploaded Signature"
                        className="max-h-28 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-32 border border-dashed rounded flex justify-center items-center text-xs text-stone-400">
                      Belum ada gambar terpilih
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0 border-t border-stone-100 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSignOpen(false)}
              className="border-stone-300 text-stone-700"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={async () => {
                let finalSign = ''
                if (signMethod === 'profile') {
                  finalSign = profile.signature || ''
                } else if (signMethod === 'upload') {
                  finalSign = uploadedSign
                  if (!finalSign) {
                    alert('Silakan unggah foto tanda tangan terlebih dahulu')
                    return
                  }
                } else if (signMethod === 'draw') {
                  if (canvasRef.current) {
                    // Check if canvas is empty
                    // Draw method requires drawing
                    finalSign = canvasRef.current.toDataURL('image/png')
                  }
                }

                if (monthToSign !== null) {
                  setIsSignOpen(false)
                  await handleSubmitForApproval(monthToSign, finalSign)
                }
              }}
              style={{ backgroundColor: '#7a0000', color: '#fff' }}
              className="hover:bg-red-900"
            >
              Kirim & Tanda Tangani
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg bg-white text-stone-900 border border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" />
              Edit Catatan Harian
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Tanggal</label>
              <input
                type="date"
                value={editForm.tanggal}
                onChange={e => {
                  const hari = getDayName(e.target.value)
                  setEditForm(f => ({ ...f, tanggal: e.target.value, hari }))
                }}
                className="w-full h-9 px-3 py-1 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {editForm.hari && (
                <p className="text-xs text-gray-400 mt-1">Hari: <span className="font-medium text-gray-600">{editForm.hari}</span></p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Uraian Kegiatan</label>
              <textarea
                value={editForm.uraian_kegiatan}
                onChange={e => setEditForm(f => ({ ...f, uraian_kegiatan: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                placeholder="Tulis uraian kegiatan..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Output / Hasil</label>
              <textarea
                value={editForm.output_hasil}
                onChange={e => setEditForm(f => ({ ...f, output_hasil: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                placeholder="Tulis output atau hasil kegiatan..."
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0 border-t border-stone-100 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="border-stone-300 text-stone-700"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



        {/* Admin Detail View Dialog */}
        <Dialog open={isAdminDetailOpen} onOpenChange={setIsAdminDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white text-stone-900 border border-stone-200">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-stone-800">
                <FileText className="w-5 h-5 text-red-700" />
                Detail Laporan: {selectedAdminUser?.full_name}
              </DialogTitle>
            </DialogHeader>

            {loadingAdminDetail ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700" />
              </div>
            ) : (
              <div className="space-y-6 my-2">
                <Tabs defaultValue="admin-cover" className="w-full">
                  <TabsList className="bg-stone-100 p-1 rounded-lg">
                    <TabsTrigger value="admin-cover" className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-green-500 data-[state=active]:text-white">
                      COVER DOKUMEN
                    </TabsTrigger>
                    <TabsTrigger value="admin-laporan" className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-white">
                      LAPORAN KINERJA & SKP
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="admin-cover" className="mt-4">
                    {selectedAdminUser ? (
                      <BukuKendaliTemplate
                        data={{
                          nama: selectedAdminUser.full_name,
                          nip: selectedAdminUser.nip,
                          pangkat: selectedAdminUser.pangkat,
                          jabatan: selectedAdminUser.jabatan,
                          bulan: adminMonth + 1,
                          tahun: selectedYear,
                          institusi: 'Sekretariat KPU Kota Palu',
                        }}
                      />
                    ) : (
                      <p className="text-center text-stone-500 text-sm">Data tidak ditemukan.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="admin-laporan" className="mt-4">
                    {selectedAdminUser && (
                       <SKPTemplate
                         profile={selectedAdminUser}
                         records={adminUserRecords}
                         bulan={adminMonth + 1}
                         tahun={selectedYear}
                         showPrint={true}
                         isAdminView={true}
                         signature={adminUserBuku ? {
                            secretary_name: adminUserBuku.secretary_name,
                            secretary_nip: adminUserBuku.secretary_nip,
                            secretary_signature: adminUserBuku.secretary_signature,
                            signed_at: adminUserBuku.signed_at,
                            user_signature: adminUserBuku.user_signature,
                            nilai: adminUserBuku.nilai,
                            jumlah_hari_kerja: adminUserBuku.jumlah_hari_kerja,
                          } : undefined}
                       />
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
            <DialogFooter className="pt-3 border-t border-stone-100">
              <Button type="button" onClick={() => setIsAdminDetailOpen(false)} className="bg-stone-900 hover:bg-stone-800 text-white">
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
