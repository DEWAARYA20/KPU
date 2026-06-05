'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Calendar, Save, Search, CheckCircle2, ClipboardList, CheckSquare, Square, Clock } from 'lucide-react'

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
  hari: string
  uraian_kegiatan: string
  output_hasil: string
  status: string
  bulan: number
  tahun: number
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

interface CalendarDay {
  dateString: string
  dayNum: number
  dayName: string
  isWeekend: boolean
}

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

  // Presence Modal States
  const [isPresenceOpen, setIsPresenceOpen] = useState(false)
  const [selectedSub, setSelectedSub] = useState<UserProfile | null>(null)
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [subRecords, setSubRecords] = useState<Record<string, ActivityRecord>>({})
  const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>({})
  const [savingPresence, setSavingPresence] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadSubordinatesData()
  }, [selectedMonth, selectedYear])

  const getDaysInMonth = (monthIndex: number, year: number): CalendarDay[] => {
    const date = new Date(year, monthIndex, 1)
    const days: CalendarDay[] = []
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    while (date.getMonth() === monthIndex) {
      const dayNum = date.getDate()
      const dateString = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      days.push({
        dateString,
        dayNum,
        dayName: dayNames[date.getDay()],
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      })
      date.setDate(date.getDate() + 1)
    }
    return days
  }

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
        console.warn('Fallback query buku_kendali...', err)
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

      // Fetch activity_records to count approved unique dates
      const { data: recordsData } = await supabase
        .from('activity_records')
        .select('user_id, tanggal, status')
        .in('user_id', subIds)
        .eq('bulan', selectedMonth + 1)
        .eq('tahun', selectedYear)
        .eq('status', 'approved')

      const newAccDaysMap: Record<string, number> = {}
      subIds.forEach(id => {
        const userRecs = (recordsData || []).filter(r => r.user_id === id)
        const uniqueDates = new Set(userRecs.map(r => r.tanggal.split('T')[0]))
        newAccDaysMap[id] = uniqueDates.size
      })
      setAccDaysMap(newAccDaysMap)

    } catch (err) {
      console.error(err)
    } final: {
      setLoading(false)
    }
  }

  const handleOpenPresence = async (sub: UserProfile) => {
    setSelectedSub(sub)
    const days = getDaysInMonth(selectedMonth, selectedYear)
    setCalendarDays(days)
    
    // Fetch all activity records for this subordinate, month, year
    try {
      const { data: recs, error } = await supabase
        .from('activity_records')
        .select('*')
        .eq('user_id', sub.id)
        .eq('bulan', selectedMonth + 1)
        .eq('tahun', selectedYear)

      if (error) throw error

      const mappedRecs: Record<string, ActivityRecord> = {}
      const checkedDays: Record<string, boolean> = {}

      // Default checkbox: true if status is 'approved'
      days.forEach(day => {
        const matchingRec = (recs || []).find(r => r.tanggal.split('T')[0] === day.dateString)
        if (matchingRec) {
          mappedRecs[day.dateString] = matchingRec
          checkedDays[day.dateString] = matchingRec.status === 'approved'
        } else {
          checkedDays[day.dateString] = false
        }
      })

      setSubRecords(mappedRecs)
      setSelectedDays(checkedDays)
      setIsPresenceOpen(true)
    } catch (err) {
      console.error(err)
      alert('Gagal mengambil data kehadiran pegawai')
    }
  }

  const handleSavePresence = async () => {
    if (!selectedSub) return
    setSavingPresence(true)
    try {
      const inserts = []
      const updates = []
      const deletes = []

      for (const day of calendarDays) {
        const isChecked = selectedDays[day.dateString]
        const existing = subRecords[day.dateString]

        if (isChecked) {
          if (!existing) {
            // Insert
            inserts.push({
              user_id: selectedSub.id,
              tanggal: day.dateString,
              hari: day.dayName,
              uraian_kegiatan: 'Kehadiran (Dikonfirmasi Atasan)',
              output_hasil: 'Hadir',
              status: 'approved',
              bulan: selectedMonth + 1,
              tahun: selectedYear
            })
          } else if (existing.status !== 'approved') {
            // Update to approved
            updates.push({ id: existing.id, status: 'approved' })
          }
        } else {
          // Unchecked
          if (existing) {
            if (existing.uraian_kegiatan === 'Kehadiran (Dikonfirmasi Atasan)') {
              // Delete supervisor created
              deletes.push(existing.id)
            } else if (existing.status === 'approved') {
              // Update staff created back to submitted or draft so it is not ACC
              updates.push({ id: existing.id, status: 'submitted' })
            }
          }
        }
      }

      // Supabase batch execution
      if (inserts.length > 0) {
        const { error } = await supabase.from('activity_records').insert(inserts)
        if (error) throw error
      }

      for (const item of updates) {
        const { error } = await supabase
          .from('activity_records')
          .update({ status: item.status })
          .eq('id', item.id)
        if (error) throw error
      }

      if (deletes.length > 0) {
        const { error } = await supabase
          .from('activity_records')
          .delete()
          .in('id', deletes)
        if (error) throw error
      }

      // Recalculate and update the buku_kendali record as well
      const updatedAccCount = calendarDays.filter(d => selectedDays[d.dateString]).length
      const existingBuku = bukuMap[selectedSub.id]
      const inputVal = inputs[selectedSub.id]

      if (existingBuku && existingBuku.id && typeof inputVal === 'number' && inputVal > 0) {
        const calculatedNilai = Math.round((updatedAccCount / inputVal) * 100)
        await supabase
          .from('buku_kendali')
          .update({ nilai: calculatedNilai })
          .eq('id', existingBuku.id)
      }

      alert('Berhasil menyimpan daftar tanggal kehadiran pegawai!')
      setIsPresenceOpen(false)
      await loadSubordinatesData()
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan tanggal kehadiran')
    } finally {
      setSavingPresence(false)
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
        <p className="text-gray-600 mt-1">Isi manual jumlah hari kerja sebulan penuh dan kelola tanggal kehadiran bawahan Anda</p>
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
                  <th className="px-6 py-3.5 text-center w-64">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubordinates.length > 0 ? (
                  filteredSubordinates.map(sub => {
                    const accDays = accDaysMap[sub.id] || 0
                    const inputVal = inputs[sub.id]
                    
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
                          <button
                            type="button"
                            onClick={() => handleOpenPresence(sub)}
                            className="inline-flex items-center justify-center bg-green-50 text-green-700 font-bold px-3 py-1 rounded-full border border-green-200 hover:bg-green-100 transition-colors cursor-pointer"
                            title="Klik untuk mengelola tanggal kehadiran bawahan"
                          >
                            {accDays} Hari (Kelola)
                          </button>
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
                          <div className="flex gap-2 justify-center">
                            <Button
                              onClick={() => handleOpenPresence(sub)}
                              variant="outline"
                              size="sm"
                              className="border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold"
                            >
                              Edit Tanggal
                            </Button>
                            <Button
                              onClick={() => handleSave(sub)}
                              disabled={savingId === sub.id}
                              className="bg-red-800 hover:bg-red-950 text-white font-medium flex items-center justify-center gap-1.5 px-3 py-1 text-xs"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {savingId === sub.id ? '...' : 'Simpan'}
                            </Button>
                          </div>
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

      {/* Kelola Kehadiran Modal */}
      <Dialog open={isPresenceOpen} onOpenChange={setIsPresenceOpen}>
        <DialogContent className="max-w-xl bg-white text-stone-900 border border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-stone-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-red-800" />
              Kelola Tanggal Hadir: {selectedSub?.full_name}
            </DialogTitle>
            <p className="text-xs text-stone-500">
              Pilih tanggal-tanggal di bawah ini saat pegawai hadir. Hari Sabtu & Minggu diberi tanda khusus.
            </p>
          </DialogHeader>

          <div className="my-2 border border-stone-200 rounded-md max-h-[50vh] overflow-y-auto bg-stone-50">
            <div className="grid grid-cols-1 divide-y divide-stone-200">
              {calendarDays.map(day => {
                const isChecked = selectedDays[day.dateString] || false
                const matchedRec = subRecords[day.dateString]
                
                return (
                  <div
                    key={day.dateString}
                    onClick={() => {
                      setSelectedDays(prev => ({ ...prev, [day.dateString]: !isChecked }))
                    }}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                      day.isWeekend ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-stone-600">
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-green-700" />
                        ) : (
                          <Square className="w-5 h-5 text-stone-400" />
                        )}
                      </div>
                      <div>
                        <span className={`font-semibold ${day.isWeekend ? 'text-red-700' : 'text-stone-800'}`}>
                          {day.dayName}, {day.dayNum} {MONTHS[selectedMonth]} {selectedYear}
                        </span>
                        {day.isWeekend && (
                          <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded ml-2">
                            Weekend
                          </span>
                        )}
                        
                        {matchedRec && matchedRec.uraian_kegiatan !== 'Kehadiran (Dikonfirmasi Atasan)' && (
                          <div className="text-[11px] text-blue-700 mt-0.5 font-medium italic">
                            Laporan Staff: "{matchedRec.uraian_kegiatan}" ({matchedRec.status === 'approved' ? 'Disetujui' : 'Diajukan'})
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {isChecked ? (
                        <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                          ACC
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-stone-400">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-between items-center text-xs font-semibold text-stone-600 bg-stone-100 p-2 rounded-md">
            <span>Total Tanggal di ACC:</span>
            <span className="text-sm font-extrabold text-green-700">
              {calendarDays.filter(d => selectedDays[d.dateString]).length} Hari
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPresenceOpen(false)}
              className="border-stone-300 text-stone-700"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSavePresence}
              disabled={savingPresence}
              className="bg-red-800 hover:bg-red-950 text-white font-bold"
            >
              {savingPresence ? 'Menyimpan...' : 'Simpan Kehadiran'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
