'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trash2 } from 'lucide-react'

interface ActivityRecord {
  id: string
  tanggal: string
  hari: string
  uraian_kegiatan: string
  output_hasil: string
  status: 'draft' | 'submitted' | 'approved'
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
}

export default function RecordsPage() {
  const [records, setRecords] = useState<Record<number, ActivityRecord[]>>({})
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const supabase = createClient()

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data: activities } = await supabase
          .from('activity_records')
          .select('*')
          .eq('user_id', user.id)
          .order('tanggal', { ascending: false })

        if (activities) {
          const grouped: Record<number, ActivityRecord[]> = {}
          activities.forEach((record) => {
            const month = record.bulan - 1
            if (!grouped[month]) {
              grouped[month] = []
            }
            grouped[month].push(record)
          })
          setRecords(grouped)
        }
      } catch (error) {
        console.error('Error loading records:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRecords()
  }, [supabase])

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan ini?')) return

    try {
      const { error } = await supabase
        .from('activity_records')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Update local state
      setRecords((prev) => {
        const updated = { ...prev }
        Object.keys(updated).forEach((month) => {
          updated[parseInt(month)] = updated[parseInt(month)].filter((r) => r.id !== id)
        })
        return updated
      })
    } catch (error) {
      console.error('Error deleting record:', error)
      alert('Gagal menghapus catatan')
    }
  }

  const submitForApproval = async (recordIds: string[]) => {
    try {
      const { error } = await supabase
        .from('activity_records')
        .update({ status: 'submitted' })
        .in('id', recordIds)

      if (error) throw error

      // Reload records
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: activities } = await supabase
        .from('activity_records')
        .select('*')
        .eq('user_id', user.id)
        .order('tanggal', { ascending: false })

      if (activities) {
        const grouped: Record<number, ActivityRecord[]> = {}
        activities.forEach((record) => {
          const month = record.bulan - 1
          if (!grouped[month]) {
            grouped[month] = []
          }
          grouped[month].push(record)
        })
        setRecords(grouped)
      }
    } catch (error) {
      console.error('Error submitting for approval:', error)
      alert('Gagal mengajukan persetujuan')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (Object.keys(records).length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Belum ada catatan harian. Mulai dengan menambahkan catatan baru.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Catatan Harian</h1>
        <p className="text-gray-600 mt-2">Lihat dan kelola catatan harian Anda per bulan</p>
      </div>

      <Tabs defaultValue={`${currentMonth}`} className="w-full">
        <TabsList className="grid grid-cols-6 lg:grid-cols-12 w-full">
          {MONTHS.map((month, index) => (
            <TabsTrigger key={index} value={`${index}`} className="text-xs">
              {month.slice(0, 3)}
            </TabsTrigger>
          ))}
        </TabsList>

        {MONTHS.map((month, index) => (
          <TabsContent key={index} value={`${index}`} className="space-y-4">
            {records[index] && records[index].length > 0 ? (
              <>
                <div className="grid gap-4">
                  {records[index].map((record) => (
                    <Card key={record.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{record.tanggal} ({record.hari})</p>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${STATUS_COLORS[record.status]}`}>
                                {record.status === 'draft' ? 'Draft' : record.status === 'submitted' ? 'Diajukan' : 'Disetujui'}
                              </span>
                            </div>
                            {record.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(record.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-medium text-gray-700">Uraian Kegiatan:</p>
                            <p className="text-sm text-gray-600 mt-1">{record.uraian_kegiatan}</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-gray-700">Output / Hasil:</p>
                            <p className="text-sm text-gray-600 mt-1">{record.output_hasil}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {records[index].some(r => r.status === 'draft') && (
                  <Button
                    onClick={() => {
                      const draftIds = records[index]
                        .filter(r => r.status === 'draft')
                        .map(r => r.id)
                      submitForApproval(draftIds)
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Ajukan Draft Bulan Ini untuk Persetujuan
                  </Button>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">Belum ada catatan untuk bulan ini</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
