'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FileText, CheckCircle, BookOpen, TrendingUp } from 'lucide-react'

interface Stats {
  draftCount: number
  submittedCount: number
  approvedCount: number
  totalCount: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    draftCount: 0,
    submittedCount: 0,
    approvedCount: 0,
    totalCount: 0,
  })
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSupervisor, setIsSupervisor] = useState(false)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const loadStats = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role, nip, unit_kerja, jabatan')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUserName(profile.full_name || 'User')

          let role = profile.role || 'staff'
          const isSupervisorUnit = profile.unit_kerja?.startsWith('Kepala') || profile.jabatan?.startsWith('Kepala')
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

          const isSup = ['secretary', 'head', 'admin'].includes(role)
          setIsSupervisor(isSup)

          // Load count of pending approvals
          if (isSup) {
            let shouldExecute = true
            let pendingQuery = supabase
              .from('buku_kendali')
              .select('id, user_id', { count: 'exact', head: true })
              .eq('status', 'submitted')

            if (role !== 'admin') {
              if (profile.nip) {
                const { data: subProfiles } = await supabase
                  .from('profiles')
                  .select('id')
                  .eq('nip_atasan', profile.nip)

                if (subProfiles && subProfiles.length > 0) {
                  const subIds = subProfiles.map(s => s.id)
                  pendingQuery = pendingQuery.in('user_id', subIds)
                } else {
                  shouldExecute = false
                }
              } else {
                shouldExecute = false
              }
            }

            if (shouldExecute) {
              const { count: pendingCount, error: pendingErr } = await pendingQuery
              if (!pendingErr && pendingCount !== null) {
                setPendingApprovalsCount(pendingCount)
              }
            }
          }
        }

        // Get activity stats
        const { data: activities } = await supabase
          .from('activity_records')
          .select('status')
          .eq('user_id', user.id)

        if (activities) {
          const draftCount = activities.filter((a) => a.status === 'draft').length
          const submittedCount = activities.filter((a) => a.status === 'submitted').length
          const approvedCount = activities.filter((a) => a.status === 'approved').length

          setStats({
            draftCount,
            submittedCount,
            approvedCount,
            totalCount: activities.length,
          })
        }
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Selamat Datang, {userName}!</h1>
        <p className="text-gray-600 mt-2">Dashboard Catatan Harian KPU</p>
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isSupervisor ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-6`}>
        {isSupervisor && (
          <Card className="border-l-4 border-l-red-600 bg-red-50/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-800">
                Persetujuan Baru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700">{pendingApprovalsCount}</div>
              <p className="text-xs text-gray-500 mt-1">Laporan staff menunggu TTD</p>
            </CardContent>
          </Card>
        )}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Catatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalCount}</div>
            <p className="text-xs text-gray-500 mt-1">Semua catatan harian</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.draftCount}</div>
            <p className="text-xs text-gray-500 mt-1">Belum disubmit</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Disubmit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.submittedCount}</div>
            <p className="text-xs text-gray-500 mt-1">Menunggu persetujuan</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Disetujui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.approvedCount}</div>
            <p className="text-xs text-gray-500 mt-1">Sudah diapprove</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 ${isSupervisor ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
            {isSupervisor && (
              <Link href="/dashboard/approvals">
                <Button className="w-full justify-start gap-2 bg-red-700 hover:bg-red-800 text-white">
                  <CheckCircle className="w-5 h-5" />
                  Persetujuan Staff ({pendingApprovalsCount})
                </Button>
              </Link>
            )}
            <Link href="/dashboard/input">
              <Button className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700">
                <FileText className="w-5 h-5" />
                Input Catatan Baru
              </Button>
            </Link>
            <Link href="/dashboard/records">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Lihat Catatan Harian
              </Button>
            </Link>
            <Link href="/dashboard/buku-kendali">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <BookOpen className="w-5 h-5" />
                Lihat Buku Kendali
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-700">Anda memiliki {stats.draftCount} catatan draft</span>
              </div>
              <Link href="/dashboard/input">
                <Button variant="ghost" size="sm">Lanjutkan</Button>
              </Link>
            </div>

            {stats.submittedCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-gray-700">{stats.submittedCount} catatan menunggu persetujuan</span>
                </div>
              </div>
            )}

            {stats.approvedCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Anda memiliki {stats.approvedCount} catatan yang sudah disetujui</span>
                </div>
              </div>
            )}

            {isSupervisor && pendingApprovalsCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded border border-red-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-stone-700 font-medium">Ada {pendingApprovalsCount} laporan staff yang membutuhkan tanda tangan Anda</span>
                </div>
                <Link href="/dashboard/approvals">
                  <Button variant="ghost" size="sm" className="text-red-700 hover:text-red-850 hover:bg-red-100/50">Periksa</Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
