'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function ActivityForm() {
  const [tanggal, setTanggal] = useState('')
  const [uraianKegiatan, setUraianKegiatan] = useState('')
  const [outputHasil, setOutputHasil] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Get day of week from date
  const getDayOfWeek = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    return days[date.getDay()]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('User tidak ditemukan')
        return
      }

      const date = new Date(tanggal)
      const bulan = date.getMonth() + 1
      const tahun = date.getFullYear()
      const hari = getDayOfWeek(tanggal)

      const { error: insertError } = await supabase
        .from('activity_records')
        .insert([
          {
            user_id: user.id,
            tanggal,
            hari,
            uraian_kegiatan: uraianKegiatan,
            output_hasil: outputHasil,
            bulan,
            tahun,
            status: 'draft',
          },
        ])

      if (insertError) {
        setError(insertError.message)
        return
      }

      // Reset form
      setTanggal('')
      setUraianKegiatan('')
      setOutputHasil('')

      // Show success and redirect
      router.push('/dashboard/records')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Input Catatan Harian</CardTitle>
        <CardDescription>Tambahkan catatan kegiatan harian Anda</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="tanggal" className="block text-sm font-medium text-gray-700">
              Tanggal
            </label>
            <Input
              id="tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor="hari" className="block text-sm font-medium text-gray-700">
              Hari
            </label>
            <Input
              id="hari"
              type="text"
              value={getDayOfWeek(tanggal)}
              disabled
              className="mt-1 bg-gray-100"
            />
          </div>

          <div>
            <label htmlFor="uraian" className="block text-sm font-medium text-gray-700">
              Uraian Kegiatan
            </label>
            <Textarea
              id="uraian"
              value={uraianKegiatan}
              onChange={(e) => setUraianKegiatan(e.target.value)}
              placeholder="Deskripsikan kegiatan yang dilakukan..."
              required
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor="output" className="block text-sm font-medium text-gray-700">
              Output / Hasil
            </label>
            <Textarea
              id="output"
              value={outputHasil}
              onChange={(e) => setOutputHasil(e.target.value)}
              placeholder="Deskripsikan output atau hasil dari kegiatan..."
              required
              rows={4}
              className="mt-1"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Menyimpan...' : 'Simpan Catatan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
