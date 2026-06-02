'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { createClient } from '@/lib/supabase/client'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | undefined>(undefined)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get user profile with role & NIP
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, nip, unit_kerja, jabatan')
        .eq('id', user.id)
        .single()

      if (profile) {
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

        setUserRole(role)
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [router, supabase])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex">
      <Sidebar userRole={userRole} />
      <div className="flex-1 ml-64 min-h-screen bg-gray-50">
        <div className="p-8">{children}</div>
      </div>
    </div>
  )
}
