'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Home,
  FileText,
  CheckCircle,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  UserCircle,
  Users,
} from 'lucide-react'

interface SidebarProps {
  userRole?: string
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const isActive = (path: string) => pathname === path

  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Input Catatan', href: '/dashboard/input', icon: FileText },
    { label: 'Catatan Harian', href: '/dashboard/records', icon: ClipboardList },
    { label: 'Rekap Bulanan', href: '/dashboard/buku-kendali', icon: BookOpen },
    { label: 'Profil Saya', href: '/dashboard/profile', icon: UserCircle },
  ]

  if (userRole === 'secretary' || userRole === 'head' || userRole === 'admin') {
    menuItems.splice(4, 0, {
      label: 'Persetujuan',
      href: '/dashboard/approvals',
      icon: CheckCircle,
    })

  }

  if (userRole === 'admin') {
    menuItems.push({
      label: 'Kelola Akun',
      href: '/dashboard/users',
      icon: Users,
    })
  }

  return (
    <div className="w-64 text-white h-screen flex flex-col fixed left-0 top-0" style={{ background: 'linear-gradient(180deg, #4a0000 0%, #7a0000 50%, #5c0000 100%)' }}>
      {/* Logo Area */}
      <div className="p-5 border-b flex flex-col items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
        <img
          src="/kpu-logo-sidebar.png"
          alt="Logo KPU"
          className="w-20 h-20 object-contain"
        />
        <div className="text-center">
          <h1 className="text-sm font-bold tracking-wide text-white leading-tight">KPU KOTA PALU</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,220,150,0.8)' }}>Catatan Kinerja Harian</p>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? 'default' : 'ghost'}
                className={`w-full justify-start gap-2 ${
                  isActive(item.href)
                    ? 'text-red-800 font-semibold hover:bg-yellow-50'
                    : 'text-white/90 hover:text-white'
                }`}
                style={isActive(item.href)
                  ? { background: 'linear-gradient(135deg, #ffdd88, #ffbb00)', color: '#5a0000' }
                  : { background: 'transparent' }
                }
                onMouseEnter={e => {
                  if (!isActive(item.href)) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive(item.href)) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }
                }}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start gap-2 text-white/80 hover:text-white"
          style={{ background: 'transparent' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </div>
  )
}
