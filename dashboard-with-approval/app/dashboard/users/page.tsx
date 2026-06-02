'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Edit, Trash2, ShieldAlert, User, Shield, Check, X } from 'lucide-react'

const PANGKAT_OPTIONS = [
  'Juru Muda / I-a',
  'Juru Muda Tk. I / I-b',
  'Juru / I-c',
  'Juru Tk. I / I-d',
  'Pengatur Muda / II-a',
  'Pengatur Muda Tk. I / II-b',
  'Pengatur / II-c',
  'Pengatur Tk. I / II-d',
  'Penata Muda / III-a',
  'Penata Muda Tk. I / III-b',
  'Penata / III-c',
  'Penata Tk. I / III-d',
  'Pembina / IV-a',
  'Pembina Tk. I / IV-b',
  'Pembina Utama Muda / IV-c',
  'Pembina Utama Madya / IV-d',
  'Pembina Utama / IV-e',
]

const SUB_BAGIAN_OPTIONS = [
  'Kepala Sub Bagian Perencanaan, Data dan Informasi',
  'Kepala Sub Bagian Partisipasi, Hubungan Masyarakat dan Sumber Daya Manusia',
  'Kepala Sub Bagian Teknis Penyelenggaraan Pemilu dan Hukum',
  'Kepala Sub Bagian Keuangan Umum dan Logistik',
  'Kepala Bagian Perencanaan, Data dan Informasi',
  'Kepala Bagian Partisipasi, Hubungan Masyarakat dan Sumber Daya Manusia',
  'Kepala Bagian Teknis Penyelenggaraan Pemilu dan Hukum',
  'Kepala Bagian Keuangan Umum dan Logistik',
]

interface Profile {
  id: string
  full_name: string
  nip: string
  pangkat: string
  jabatan: string
  unit_kerja: string
  role: 'staff' | 'head' | 'secretary' | 'admin'
  updated_at: string
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // Form states
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  
  // Fields for create/edit
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [nip, setNip] = useState('')
  const [pangkat, setPangkat] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [unitKerja, setUnitKerja] = useState('')
  const [role, setRole] = useState<'staff' | 'head' | 'secretary' | 'admin'>('staff')

  // New states for manual writing
  const [isManualUnitCreate, setIsManualUnitCreate] = useState(false)
  const [manualUnitCreate, setManualUnitCreate] = useState('')
  const [isManualUnitEdit, setIsManualUnitEdit] = useState(false)
  const [manualUnitEdit, setManualUnitEdit] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    checkAdminAndLoad()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAdminAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile && profile.role === 'admin') {
        setIsAdmin(true)
        await loadProfiles()
      } else {
        setIsAdmin(false)
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const loadProfiles = async () => {
    setLoading(true)
    try {
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true })

      if (fetchErr) throw fetchErr
      if (data) setProfiles(data as Profile[])
    } catch (err) {
      console.error(err)
      setError('Gagal memuat profil pengguna.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setNip('')
    setPangkat('')
    setJabatan('')
    setUnitKerja('')
    setRole('staff')
    setIsManualUnitCreate(false)
    setManualUnitCreate('')
    setIsManualUnitEdit(false)
    setManualUnitEdit('')
    setError(null)
    setSuccess(null)
  }

  // Create User using temporary client so admin session is not lost
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    if (!email.trim() || !password.trim() || !fullName.trim() || !nip.trim() || !pangkat || !jabatan.trim()) {
      setError('Harap isi semua kolom wajib (kecuali Bagian / Sub Bagian).')
      setSubmitting(false)
      return
    }

    try {
      // 1. Create temporary client instance
      const tempSupabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      )

      // 2. Sign up the new user (doesn't log out current admin because persistSession is false)
      const { data: signUpData, error: signUpErr } = await tempSupabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })

      if (signUpErr) throw signUpErr
      if (!signUpData.user) throw new Error('Gagal mendaftarkan user baru.')

      const finalUnitKerja = isManualUnitCreate ? manualUnitCreate : unitKerja

      // 3. Insert user profile metadata using the main admin client
      const { error: profileErr } = await supabase.from('profiles').insert([{
        id: signUpData.user.id,
        full_name: fullName,
        nip,
        pangkat,
        jabatan,
        unit_kerja: finalUnitKerja,
        role,
        updated_at: new Date().toISOString(),
      }])

      if (profileErr) throw profileErr

      setSuccess('Akun berhasil dibuat!')
      setTimeout(() => {
        setIsCreateOpen(false)
        resetForm()
        loadProfiles()
      }, 1500)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Gagal membuat akun baru.')
    } finally {
      setSubmitting(false)
    }
  }

  // Edit User Profile
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProfile) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const finalUnitKerja = isManualUnitEdit ? manualUnitEdit : unitKerja

      const { error: editErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          nip,
          pangkat,
          jabatan,
          unit_kerja: finalUnitKerja,
          role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedProfile.id)

      if (editErr) throw editErr

      setSuccess('Profil berhasil diperbarui!')
      setTimeout(() => {
        setIsEditOpen(false)
        resetForm()
        loadProfiles()
      }, 1500)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Gagal memperbarui profil.')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete User Profile
  const handleDelete = async () => {
    if (!selectedProfile) return
    setSubmitting(true)
    setError(null)

    try {
      const { error: delErr } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedProfile.id)

      if (delErr) throw delErr

      setIsDeleteOpen(false)
      resetForm()
      await loadProfiles()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Gagal menghapus profil.')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (p: Profile) => {
    setSelectedProfile(p)
    setFullName(p.full_name || '')
    setNip(p.nip || '')
    setPangkat(p.pangkat || '')
    setJabatan(p.jabatan || '')
    
    // Check if the loaded unit_kerja exists in standard options
    if (p.unit_kerja && !SUB_BAGIAN_OPTIONS.includes(p.unit_kerja)) {
      setIsManualUnitEdit(true)
      setManualUnitEdit(p.unit_kerja)
      setUnitKerja('')
    } else {
      setIsManualUnitEdit(false)
      setManualUnitEdit('')
      setUnitKerja(p.unit_kerja || '')
    }

    setRole(p.role || 'staff')
    setIsEditOpen(true)
  }

  const openDeleteModal = (p: Profile) => {
    setSelectedProfile(p)
    setIsDeleteOpen(true)
  }

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'admin':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Admin</span>
      case 'secretary':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Sekretaris</span>
      case 'head':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Atasan</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">Staf</span>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#7a0000' }} />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <Card className="border border-stone-200 shadow-sm max-w-md mx-auto mt-20 bg-white text-stone-900">
        <CardHeader className="text-center">
          <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-2" />
          <CardTitle className="text-xl font-bold">Akses Ditolak</CardTitle>
          <CardDescription className="text-stone-500">Halaman ini hanya dapat diakses oleh Administrator KPU.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => window.location.href = '/dashboard'} style={{ backgroundColor: '#7a0000', color: '#fff' }}>
            Kembali ke Dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-red-800" />
            Kelola Akun Pengguna
          </h1>
          <p className="text-gray-600 mt-1">Kelola hak akses, jabatan, pangkat, dan identitas seluruh akun terdaftar</p>
        </div>
        <Button
          onClick={() => { resetForm(); setIsCreateOpen(true) }}
          className="gap-2 self-start md:self-auto bg-stone-900 hover:bg-stone-800 text-white"
        >
          <Plus className="w-4 h-4" />
          Tambah Akun Baru
        </Button>
      </div>

      {/* Main Table */}
      <Card className="border border-stone-200 shadow-sm bg-white text-stone-900 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">Daftar Pengguna Aktif</CardTitle>
          <CardDescription>Menampilkan {profiles.length} akun terdaftar di aplikasi KPU</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-xs font-semibold border-b border-stone-100">
              <tr>
                <th className="px-6 py-3.5">Nama & NIP</th>
                <th className="px-6 py-3.5">Pangkat / Golongan</th>
                <th className="px-6 py-3.5">Jabatan</th>
                <th className="px-6 py-3.5">Bagian / Sub Bagian</th>
                <th className="px-6 py-3.5 text-center">Role</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-stone-900">{p.full_name}</div>
                    <div className="text-xs text-stone-400 mt-0.5">NIP. {p.nip || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-stone-600 font-medium">{p.pangkat || '-'}</td>
                  <td className="px-6 py-4 text-stone-600 font-medium">{p.jabatan || '-'}</td>
                  <td className="px-6 py-4 text-stone-500 text-xs font-medium max-w-[200px] truncate" title={p.unit_kerja}>{p.unit_kerja || '-'}</td>
                  <td className="px-6 py-4 text-center">{getRoleBadge(p.role)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(p)}
                        className="text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteModal(p)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-stone-400">
                    Tidak ada akun pengguna terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* CREATE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl bg-white text-stone-900 border border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              Daftarkan Akun Baru
            </DialogTitle>
            <DialogDescription>Masukkan kredensial akun dan data diri pegawai secara lengkap.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 my-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="create-email">Email KPU <span className="text-red-500">*</span></Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="contoh@kpu.go.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-password">Password <span className="text-red-500">*</span></Label>
                <Input
                  id="create-password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="h-px bg-stone-100 my-2" />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="create-name">Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input
                  id="create-name"
                  type="text"
                  placeholder="Nama Lengkap & Gelar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-nip">NIP <span className="text-red-500">*</span></Label>
                <Input
                  id="create-nip"
                  type="text"
                  placeholder="Contoh: 198501012010..."
                  value={nip}
                  onChange={(e) => setNip(e.target.value.replace(/\D/g, ''))}
                  maxLength={18}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="create-pangkat">Pangkat / Golongan <span className="text-red-500">*</span></Label>
                <Select value={pangkat} onValueChange={setPangkat} required>
                  <SelectTrigger id="create-pangkat" className="bg-white border border-stone-200">
                    <SelectValue placeholder="Pilih pangkat..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-stone-900 border border-stone-200">
                    {PANGKAT_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-jabatan">Jabatan <span className="text-red-500">*</span></Label>
                <Input
                  id="create-jabatan"
                  type="text"
                  placeholder="Contoh: Staf Keuangan"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="create-unit">Bagian / Sub Bagian <span className="text-stone-400 font-normal">(Opsional)</span></Label>
                {!isManualUnitCreate ? (
                  <Select value={unitKerja} onValueChange={(v) => {
                    if (v === 'manual') {
                      setIsManualUnitCreate(true)
                      setUnitKerja('')
                    } else {
                      setUnitKerja(v)
                    }
                  }}>
                    <SelectTrigger id="create-unit" className="bg-white border border-stone-200">
                      <SelectValue placeholder="Pilih bagian..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-stone-900 border border-stone-200">
                      {SUB_BAGIAN_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                      <SelectItem value="manual" className="font-semibold text-yellow-600">
                        + Tulis Manual...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Tulis bagian..."
                      value={manualUnitCreate}
                      onChange={(e) => setManualUnitCreate(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsManualUnitCreate(false)
                        setManualUnitCreate('')
                      }}
                      className="px-3 border-stone-300"
                    >
                      Batal
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-role">Hak Akses (Role) <span className="text-red-500">*</span></Label>
                <Select value={role} onValueChange={(r: any) => setRole(r)} required>
                  <SelectTrigger id="create-role" className="bg-white border border-stone-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-stone-900 border border-stone-200">
                    <SelectItem value="staff">Staf (Bawahan)</SelectItem>
                    <SelectItem value="head">Atasan (Supervisor)</SelectItem>
                    <SelectItem value="secretary">Sekretaris</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{error}</div>}
            {success && <div className="text-sm text-green-600 bg-green-50 p-2.5 rounded border border-green-200">{success}</div>}

            <DialogFooter className="pt-3 border-t border-stone-100">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="border-stone-300">Batal</Button>
              <Button type="submit" disabled={submitting} style={{ backgroundColor: '#7a0000', color: '#fff' }}>
                {submitting ? 'Membuat...' : 'Buat Akun'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl bg-white text-stone-900 border border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Edit Akun Pengguna
            </DialogTitle>
            <DialogDescription>Perbarui data diri pegawai dan hak akses yang diinginkan.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 my-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-name">Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-nip">NIP <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-nip"
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value.replace(/\D/g, ''))}
                  maxLength={18}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-pangkat">Pangkat / Golongan <span className="text-red-500">*</span></Label>
                <Select value={pangkat} onValueChange={setPangkat} required>
                  <SelectTrigger id="edit-pangkat" className="bg-white border border-stone-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-stone-900 border border-stone-200">
                    {PANGKAT_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-jabatan">Jabatan <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-jabatan"
                  type="text"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-unit">Bagian / Sub Bagian <span className="text-stone-400 font-normal">(Opsional)</span></Label>
                {!isManualUnitEdit ? (
                  <Select value={unitKerja} onValueChange={(v) => {
                    if (v === 'manual') {
                      setIsManualUnitEdit(true)
                      setUnitKerja('')
                    } else {
                      setUnitKerja(v)
                    }
                  }}>
                    <SelectTrigger id="edit-unit" className="bg-white border border-stone-200">
                      <SelectValue placeholder="Pilih bagian..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-stone-900 border border-stone-200">
                      {SUB_BAGIAN_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                      <SelectItem value="manual" className="font-semibold text-yellow-600">
                        + Tulis Manual...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Tulis bagian..."
                      value={manualUnitEdit}
                      onChange={(e) => setManualUnitEdit(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsManualUnitEdit(false)
                        setManualUnitEdit('')
                      }}
                      className="px-3 border-stone-300"
                    >
                      Batal
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-role">Hak Akses (Role) <span className="text-red-500">*</span></Label>
                <Select value={role} onValueChange={(r: any) => setRole(r)} required>
                  <SelectTrigger id="edit-role" className="bg-white border border-stone-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-stone-900 border border-stone-200">
                    <SelectItem value="staff">Staf (Bawahan)</SelectItem>
                    <SelectItem value="head">Atasan (Supervisor)</SelectItem>
                    <SelectItem value="secretary">Sekretaris</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{error}</div>}
            {success && <div className="text-sm text-green-600 bg-green-50 p-2.5 rounded border border-green-200">{success}</div>}

            <DialogFooter className="pt-3 border-t border-stone-100">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="border-stone-300">Batal</Button>
              <Button type="submit" disabled={submitting} style={{ backgroundColor: '#7a0000', color: '#fff' }}>
                {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-white text-stone-900 border border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Hapus Akun Pengguna?
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus akun profil <strong>{selectedProfile?.full_name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 border-t border-stone-100">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className="border-stone-300">Batal</Button>
            <Button type="button" onClick={handleDelete} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
              {submitting ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
