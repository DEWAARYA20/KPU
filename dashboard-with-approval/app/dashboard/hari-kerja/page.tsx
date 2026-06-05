'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Save, Search, CheckCircle2, AlertCircle } from 'lucide-react'

interface UserProfile {
  id: string
  full_name: string
  nip: string
  pangkat: string
  jabatan: string
  unit_kerja: string
  nip_atasan?: string
}

interface ActivityRecord {
  id: string
  user_id: string
  tanggal: string
  status: string
}

interface BukuKendali {
  id?: string
  user_id: string
  bulan: number
  tahun: number
  jumlah_hari_kerja?: number
  nilai?: number
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export default function HariKerjaPage() {
  const [subordinates, setSubordinates] = useState<UserProfile[]>([])
  const [bukuMap, setBukuMap] = useState<Record<string, BukuKendali>>({})
  const [accDaysMap, setAccDaysMap] = useState<Record<string, number>>({})
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [searchTerm, setSearchTerm] = useState('')
  
  const [inputs, setInputs] = useState<Record<string, number | ''>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadSubordinatesData()
  }, [selectedMonth, selectedYear])

  const loadSubordinatesData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      if (!profile) return

      let role = profile.role || 'staff'
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

      setUserRole(role)
      setCurrentProfile(profile)

      if (!['secretary', 'head', 'admin'].includes(role)) {
        setLoading(false)
        return
      }

      // Load all profiles
      const { data: allProfiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, nip, pangkat, jabatan, unit_kerja, nip_atasan')
      
      if (pError || !allProfiles) throw pError || new Error('Gagal memuat profil')

      // Filter subordinates
      let list: UserProfile[] = []
      if (role === 'admin') {
        list = allProfiles.filter(p => p.id !== user.id)
      } else {
        const byNip = allProfiles.filter(p => p.nip_atasan && p.nip_atasan.trim() === (profile.nip || '').trim())
        if (byNip.length > 0) {
          list = byNip
        } else {
          // Fallback if nip_atasan not set up properly
          list = allProfiles.filter(p => p.id !== user.id)
        }
      }
      setSubordinates(list)

      const subIds = list.map(s => s.id)
      if (subIds.length === 0) {
        setLoading(false)
        return
      }

      // Fetch buku_kendali
      let bkData: any[] = []
      try {
        const { data } = await supabase
          .from('buku_kendali')
          .select('id, user_id, bulan, tahun, jumlah_hari_kerja, nilai')
          .in('user_id', subIds)
          .eq('bulan', selectedMonth + 1)
          .eq('tahun', selectedYear)
        bkData = data || []
      } catch (err) {
        console.warn('Gagal memuat buku_kendali dengan jumlah_hari_kerja. Melakukan query fallback...', err)
        const { data } = await supabase
          .from('buku_kendali')
          .select('id, user_id, bulan, tahun, nilai')
          .in('user_id', subIds)
          .eq('bulan', selectedMonth + 1)
          .eq('tahun', selectedYear)
        bkData = data || []
      }

      const newBukuMap: Record<string, BukuKendali> = {}
      const newInputMap: Record<string, number | ''> = {}
      bkData.forEach((b: any) => {
        newBukuMap[b.user_id] = b
        newInputMap[b.user_id] = b.jumlah_hari_kerja ?? ''
      })
      setBukuMap(newBukuMap)
      setInputs(newInputMap)

      // Fetch activity_records to count approved/submitted unique dates
      const { data: recordsData } = await supabase
        .from('activity_records')
        .select('user_id, tanggal, status')
        .in('user_id', subIds)
        .eq('bulan', selectedMonth + 1)
        .eq('tahun', selectedYear)
        .in('status', ['submitted', 'approved'])

      const newAccDaysMap: Record<string, number> = {}
      subIds.forEach(id => {
        const userRecs = (recordsData || []).filter(r => r.user_id === id)
        const uniqueDates = new Set(userRecs.map(r => r.tanggal.split('T')[0]))
        newAccDaysMap[id] = uniqueDates.size
      })
      setAccDaysMap(newAccDaysMap)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (sub: UserProfile) => {
    const inputVal = inputs[sub.id]
    if (inputVal === undefined || inputVal === '' || inputVal < 1 || inputVal > 31) {
      alert('Masukkan jumlah hari kerja yang valid antara 1 s.d 31')
      return
    }

    setSavingId(sub.id)
    try {
      const accDays = accDaysMap[sub.id] || 0
      const calculatedNilai = Math.round((accDays / Number(inputVal)) * 100)

      const existingBuku = bukuMap[sub.id]
      
      let error: any = null
      
      if (existingBuku && existingBuku.id) {
        // Update
        const result = await supabase
          .from('buku_kendali')
          .update({
            jumlah_hari_kerja: Number(inputVal),
            nilai: calculatedNilai
          })
          .eq('id', existingBuku.id)
        error = result.error
      } else {
        // Insert
        const { data: { user } } = await supabase.auth.getUser()
        const result = await supabase
          .from('buku_kendali')
          .insert([{
            user_id: sub.id,
            bulan: selectedMonth + 1,
            tahun: selectedYear,
            status: 'draft',
            jumlah_hari_kerja: Number(inputVal),
            nilai: calculatedNilai
          }])
        error = result.error
      }

      if (error) throw error

      alert(`Sukses menyimpan Jumlah Hari Kerja untuk ${sub.full_name}`)
      await loadSubordinatesData()
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan ke database. Harap jalankan migrasi SQL terlebih dahulu!')
    } finally {
      setSavingId(null)
    }
  }

  if (loading && subordinates.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800" />
      </div>
    )
  }

  if (!['secretary', 'head', 'admin'].includes(userRole || '')) {
    return (
      <div className="p-8 text-center text-gray-500">
        Anda tidak memiliki akses untuk melihat halaman ini. Hanya atasan yang dapat menginput data.
      </div>
    )
  }

  const filteredSubordinates = subordinates.filter(sub => {
    const term = searchTerm.toLowerCase()
    return (
      sub.full_name.toLowerCase().includes(term) ||
      sub.nip.toLowerCase().includes(term)
    )
  })

  const currentYearVal = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYearVal - 2 + i)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Input Hari Kerja</h1>
        <p className="text-gray-600 mt-1">Isi manual jumlah hari kerja sebulan penuh untuk bawahan Anda</p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-stone-700">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Cari bawahan berdasarkan nama / NIP..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 h-9 rounded-md border border-stone-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 text-stone-900"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase">Bulan</label>
            <Select value={`${selectedMonth}`} onValueChange={v => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={`${i}`}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase">Tahun</label>
            <Select value={`${selectedYear}`} onValueChange={v => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-24 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={`${y}`}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Subordinate Management Table */}
      <Card className="border border-stone-200 shadow-sm">
        <CardHeader className="bg-stone-50 border-b border-stone-200">
          <CardTitle className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-800" />
            Pengisian Hari Kerja Bulanan — {MONTHS[selectedMonth]} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-semibold">
                  <th className="px-6 py-3.5">Nama Pegawai & NIP</th>
                  <th className="px-6 py-3.5 text-center">Hari Kerja di ACC (Tanggal Unik)</th>
                  <th className="px-6 py-3.5 text-center w-48">Jumlah Hari Kerja (Manual)</th>
                  <th className="px-6 py-3.5 text-center">Nilai Kinerja (%)</th>
                  <th className="px-6 py-3.5 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubordinates.length > 0 ? (
                  filteredSubordinates.map(sub => {
                    const accDays = accDaysMap[sub.id] || 0
                    const inputVal = inputs[sub.id]
                    
                    // Live preview of Nilai
                    const nilaiPreview = (typeof inputVal === 'number' && inputVal > 0)
                      ? Math.round((accDays / inputVal) * 100)
                      : 0

                    return (
                      <tr key={sub.id} className="border-b border-stone-200 hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4.5">
                          <div className="font-semibold text-stone-900 text-base">{sub.full_name}</div>
                          <div className="text-stone-500 text-xs mt-0.5">NIP. {sub.nip || '—'} | {sub.jabatan || '—'}</div>
                        </td>
                        <td className="px-6 py-4.5 text-center">
                          <span className="inline-flex items-center justify-center bg-green-50 text-green-700 font-bold px-3 py-1 rounded-full border border-green-200">
                            {accDays} Hari
                          </span>
                        </td>
                        <td className="px-6 py-4.5 text-center">
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              min="1"
                              max="31"
                              placeholder="Hari kerja..."
                              value={inputs[sub.id] ?? ''}
                              onChange={e => {
                                const val = parseInt(e.target.value)
                                setInputs(prev => ({
                                  ...prev,
                                  [sub.id]: isNaN(val) ? '' : Math.min(31, Math.max(1, val))
                                }))
                              }}
                              className="w-32 h-9 text-center px-3 py-1 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 text-stone-900 font-semibold"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4.5 text-center">
                          <span className={`text-base font-extrabold ${nilaiPreview >= 71 ? 'text-green-700' : 'text-amber-700'}`}>
                            {nilaiPreview}%
                          </span>
                        </td>
                        <td className="px-6 py-4.5 text-center">
                          <Button
                            onClick={() => handleSave(sub)}
                            disabled={savingId === sub.id}
                            className="bg-red-800 hover:bg-red-950 text-white font-medium flex items-center justify-center gap-1.5 w-full py-1.5"
                          >
                            <Save className="w-4 h-4" />
                            {savingId === sub.id ? 'Menyimpan...' : 'Simpan'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-stone-400 italic">
                      {searchTerm ? 'Tidak ada bawahan yang sesuai dengan pencarian' : 'Belum ada bawahan yang terdaftar'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
