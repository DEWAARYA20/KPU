'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SKPTemplate } from '@/components/skp-template'
import { BukuKendaliTemplate } from '@/components/buku-kendali-template'
import { Send, CheckCircle2, Clock, FileText } from 'lucide-react'

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
}

interface UserProfile {
  full_name: string
  nip: string
  pangkat: string
  jabatan: string
  unit_kerja: string
  nama_atasan: string
  nip_atasan: string
  jabatan_atasan: string
  skp_items?: string[]
}

const MONTHS = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER',
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
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
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
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState<number | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  // coverMonth: which month is shown on the cover (0-indexed), default = current month
  const [coverMonth, setCoverMonth] = useState(new Date().getMonth())

  // Cover custom date range states
  const [coverPeriodType, setCoverPeriodType] = useState<'monthly' | 'custom'>('monthly')
  const [coverStartDate, setCoverStartDate] = useState('')
  const [coverEndDate, setCoverEndDate] = useState('')

  // Report custom date range states
  const [reportPeriodType, setReportPeriodType] = useState<Record<number, 'monthly' | 'custom'>>({})
  const [reportStartDate, setReportStartDate] = useState<Record<number, string>>({})
  const [reportEndDate, setReportEndDate] = useState<Record<number, string>>({})

  const supabase = createClient()

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

  const handleSubmitForApproval = async (monthIndex: number) => {
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
          .update({ status: 'submitted' }).eq('id', existing.id)
      } else {
        await supabase.from('buku_kendali').insert([{
          user_id: user.id, bulan, tahun: selectedYear, status: 'submitted',
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

      <Tabs defaultValue="cover" className="w-full">
        {/* Tab list: COVER + 12 bulan */}
        <TabsList className="flex flex-wrap h-auto gap-1 justify-start bg-gray-100 p-1 rounded-lg">
          {/* COVER tab */}
          <TabsTrigger
            value="cover"
            className="text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-green-500 data-[state=active]:text-white"
          >
            COVER
          </TabsTrigger>

          {/* Month tabs */}
          {MONTHS.map((month, index) => {
            const buku = bukuKendali[index]
            const hasRecords = records[index] && records[index].length > 0
            return (
              <TabsTrigger
                key={index}
                value={`${index}`}
                onClick={() => setCurrentMonth(index)}
                className="text-xs px-2.5 py-1.5 flex flex-col items-center gap-0.5 data-[state=active]:bg-white"
              >
                {MONTHS_SHORT[index]}
                {hasRecords && (
                  <span className={`w-1.5 h-1.5 rounded-full mx-auto ${
                    buku?.status === 'approved' ? 'bg-green-500' :
                    buku?.status === 'submitted' ? 'bg-yellow-500' :
                    'bg-blue-400'
                  }`} />
                )}
              </TabsTrigger>
            )
          })}
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

        {/* Monthly Tab Contents */}
        {MONTHS.map((month, index) => {
          const monthRecords = records[index] || []
          
          // Filter records if Rentang Tanggal is active
          const isCustomPeriod = reportPeriodType[index] === 'custom'
          const rStart = reportStartDate[index]
          const rEnd = reportEndDate[index]
          
          const filteredRecords = isCustomPeriod && rStart && rEnd
            ? monthRecords.filter(r => r.tanggal >= rStart && r.tanggal <= rEnd)
            : monthRecords

          const buku = bukuKendali[index]
          const status = buku?.status || 'draft'
          const StatusInfo = STATUS_INFO[status as keyof typeof STATUS_INFO]
          const StatusIcon = StatusInfo.icon
          const hasDrafts = monthRecords.some(r => r.status === 'draft')

          const customPeriodText = isCustomPeriod && rStart && rEnd
            ? formatIndonesianDateRange(rStart, rEnd)
            : undefined

          return (
            <TabsContent key={index} value={`${index}`} className="space-y-4 mt-4">
              {/* Status bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${StatusInfo.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {StatusInfo.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {filteredRecords.length} catatan — {month} {selectedYear}
                  </span>
                </div>

                {(status === 'draft' || hasDrafts) && monthRecords.length > 0 && (
                  <Button
                    onClick={() => handleSubmitForApproval(index)}
                    disabled={submitting === index}
                    className="gap-2"
                    style={{ background: '#7a0000', color: '#fff' }}
                  >
                    <Send className="w-4 h-4" />
                    {submitting === index ? 'Mengajukan...' : 'Ajukan Persetujuan'}
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
                      onClick={() => setReportPeriodType(prev => ({ ...prev, [index]: 'monthly' }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        (reportPeriodType[index] || 'monthly') === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Seluruh Bulan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const { startDateStr, endDateStr } = getDefaultDatesForMonth(index, selectedYear)
                        setReportPeriodType(prev => ({ ...prev, [index]: 'custom' }))
                        setReportStartDate(prev => ({ ...prev, [index]: prev[index] || startDateStr }))
                        setReportEndDate(prev => ({ ...prev, [index]: prev[index] || endDateStr }))
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        reportPeriodType[index] === 'custom' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Rentang Tanggal
                    </button>
                  </div>
                </div>

                {reportPeriodType[index] === 'custom' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Tanggal Mulai</label>
                      <input
                        type="date"
                        value={reportStartDate[index] || ''}
                        onChange={e => setReportStartDate(prev => ({ ...prev, [index]: e.target.value }))}
                        className="h-9 w-40 px-3 py-1 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Tanggal Selesai</label>
                      <input
                        type="date"
                        value={reportEndDate[index] || ''}
                        onChange={e => setReportEndDate(prev => ({ ...prev, [index]: e.target.value }))}
                        className="h-9 w-40 px-3 py-1 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* SKP Template */}
              {profile.full_name ? (
                <SKPTemplate
                  profile={profile}
                  records={filteredRecords}
                  bulan={index + 1}
                  tahun={selectedYear}
                  customPeriodText={customPeriodText}
                  onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)}
                  signature={buku?.status === 'approved' ? {
                    secretary_name: buku.secretary_name,
                    secretary_nip: buku.secretary_nip,
                    secretary_signature: buku.secretary_signature,
                    signed_at: buku.signed_at,
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
        })}
      </Tabs>
    </div>
  )
}
