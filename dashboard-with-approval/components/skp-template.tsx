'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, Settings, Plus, Trash2, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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
  status: string
}

interface UserProfile {
  full_name: string
  nip: string
  pangkat: string
  jabatan: string
  unit_kerja: string
  nama_atasan?: string
  nip_atasan?: string
  jabatan_atasan?: string
  skp_items?: string[]
}

interface SignatureData {
  secretary_name?: string
  secretary_nip?: string
  secretary_signature?: string
  signed_at?: string
}

interface SKPTemplateProps {
  profile: UserProfile
  records: ActivityRecord[]
  bulan: number
  tahun: number
  signature?: SignatureData
  showPrint?: boolean
  customPeriodText?: string
  onProfileUpdate?: (profile: UserProfile) => void
}

const MONTH_NAMES = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER',
]

const DEFAULT_SKP_ITEMS = [
  'Terlaksananya Penyusunan Sasaran Kinerja Pegawai (SKP) dan Laporan Kinerja Pegawai Tepat Waktu dan Sesuai dengan Tugas Pokok dan Fungsi',
  'Terlaksananya Layanan Manajemen Kepegawaian (Penyusunan dan Pengusulan Struktur Jabatan Fungsional Umum, Kenaikan Pangkat, Kenaikan Gaji Berkala, Tugas/Izin Belajar Pegawai, Pegawai yang mengikuti Diklat Pengadaan Barang dan Jasa dan Pemutakhiran Data Pegawai pada Aplikasi MYASN, SIASN dan SIMPEG)',
  'Terlaksananya Penyusunan Rekapitulasi Nominatif Pembayaran Tunjangan Kinerja Pegawai dan Uang Makan Pegawai berdasarkan Laporan dan Daftar Hadir Pegawai',
  'Terlaksananya Pengelolaan Website dan Media Sosial KPU Kota Palu',
  'Terlaksananya Pendidikan Pemilih Non Tahapan Pemilihan',
  'Terlaksananya Penyusunan Laporan Bakohumas KPU Kota Palu',
]

const KETERANGAN_PENILAIAN = [
  '71% s.d 100% tidak dikenakan potongan tukin',
  '51% s.d 70% dikenakan potongan tukin sebesar 5%',
  '11% s.d 50% dikenakan potongan tukin sebesar 7,5%',
  '4% - 10% dikenakan potongan tukin sebsar 10%',
]

// Shared cell style
const cell = (extra?: React.CSSProperties): React.CSSProperties => ({
  border: '1px solid black',
  padding: '5px 7px',
  verticalAlign: 'top',
  fontSize: '10pt',
  ...extra,
})

const headerCell = (extra?: React.CSSProperties): React.CSSProperties => ({
  ...cell(extra),
  backgroundColor: '#b8c4d8',
  fontWeight: 'bold',
  textAlign: 'center',
})

export function SKPTemplate({
  profile,
  records,
  bulan,
  tahun,
  signature,
  showPrint = true,
  customPeriodText,
  onProfileUpdate,
}: SKPTemplateProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [editingSkpItems, setEditingSkpItems] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const skpItems = (profile.skp_items && profile.skp_items.length > 0)
    ? profile.skp_items
    : DEFAULT_SKP_ITEMS

  const handleSaveSKP = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('User tidak ditemukan')
        return
      }

      // Filter empty items
      const cleanedItems = editingSkpItems.map(i => i.trim()).filter(Boolean)

      const { error } = await supabase
        .from('profiles')
        .update({ skp_items: cleanedItems })
        .eq('id', user.id)

      if (error) throw error

      if (onProfileUpdate) {
        onProfileUpdate({
          ...profile,
          skp_items: cleanedItems,
        })
      }
      setIsManageOpen(false)
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan uraian tugas SKP')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrint = () => {
    if (!printRef.current) return
    const content = printRef.current.innerHTML
    const printWindow = window.open('', '_blank', 'height=900,width=900')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Kinerja Harian - ${customPeriodText || `${MONTH_NAMES[bulan - 1]} ${tahun}`}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 10pt; padding: 12mm; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 5px 7px; vertical-align: top; }
            @media print { body { padding: 8mm; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }

  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
  )

  const formatTanggal = (tanggal: string, hari: string) => {
    const date = new Date(tanggal)
    const day = date.getDate()
    const month = MONTH_NAMES[date.getMonth()]
    return `${hari}, ${day} ${month} ${tahun}`
  }

  const signedDate = signature?.signed_at
    ? new Date(signature.signed_at).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  const totalRecords = sortedRecords.length
  const nilaiPersen = totalRecords > 0 ? 100 : 0

  return (
    <div className="space-y-3">
      {showPrint && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingSkpItems([...skpItems])
              setIsManageOpen(true)
            }}
            className="gap-2 border-stone-300 text-stone-700 hover:bg-stone-50"
          >
            <Settings className="w-4 h-4" />
            Kelola Uraian Tugas (SKP)
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Cetak Dokumen
          </Button>
        </div>
      )}

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="max-w-2xl bg-white text-stone-900 border border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-stone-800">
              <Settings className="w-5 h-5 text-red-700" />
              Kelola Uraian Tugas SKP
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 my-2 overflow-y-auto max-h-[50vh] pr-2">
            {editingSkpItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start border-b border-stone-100 pb-3">
                <span className="font-bold text-stone-400 mt-2 w-6 text-center">{idx + 1}</span>
                <textarea
                  value={item}
                  onChange={(e) => {
                    const newItems = [...editingSkpItems]
                    newItems[idx] = e.target.value
                    setEditingSkpItems(newItems)
                  }}
                  className="flex-1 min-h-[60px] p-2 border border-stone-300 rounded-md text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-white"
                  placeholder="Tulis uraian tugas SKP..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newItems = editingSkpItems.filter((_, i) => i !== idx)
                    setEditingSkpItems(newItems)
                  }}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {editingSkpItems.length === 0 && (
              <p className="text-center text-stone-500 text-sm py-4">Belum ada uraian tugas SKP. Klik Tambah Uraian Tugas untuk membuat baru.</p>
            )}
          </div>

          <div className="flex justify-between gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingSkpItems(DEFAULT_SKP_ITEMS)}
              className="gap-1 border-stone-300 text-stone-700 hover:bg-stone-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset ke Default
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingSkpItems([...editingSkpItems, ''])}
              className="gap-1 border-stone-300 text-stone-700 hover:bg-stone-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Uraian Tugas
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-stone-100 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsManageOpen(false)}
              className="border-stone-300 text-stone-700"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveSKP}
              disabled={isSaving}
              style={{ backgroundColor: '#7a0000', color: '#fff' }}
              className="hover:bg-red-900"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        ref={printRef}
        className="bg-white text-sm shadow-sm border border-gray-200 rounded"
        style={{ fontFamily: 'Arial, sans-serif', padding: '24px' }}
      >
        {/* ===== SECTION 1: SKP ===== */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
          <thead>
            <tr>
              <td
                colSpan={2}
                style={headerCell({ textAlign: 'center', fontSize: '11pt', padding: '8px' })}
              >
                URAIAN TUGAS SASARAN KINERJA PEGAWAI (SKP)
              </td>
            </tr>
            <tr>
              <th style={headerCell({ width: '6%' })}>NO</th>
              <th style={headerCell()}>URAIAN TUGAS SKP</th>
            </tr>
          </thead>
          <tbody>
            {skpItems.map((item, index) => (
              <tr key={index}>
                <td style={cell({ textAlign: 'center', width: '6%' })}>{index + 1}</td>
                <td style={cell()}>{item}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ===== SECTION 2: LAPORAN KINERJA ===== */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0' }}>
          <thead>
            <tr>
              <td
                colSpan={5}
                style={headerCell({ textAlign: 'center', fontSize: '11pt', padding: '8px' })}
              >
                LAPORAN KINERJA {customPeriodText ? `(PERIODE: ${customPeriodText})` : `(BULAN: ${MONTH_NAMES[bulan - 1]} ${tahun})`}
              </td>
            </tr>
            <tr>
              <th style={headerCell({ width: '5%' })}>NO</th>
              <th style={headerCell({ width: '18%' })}>HARI/TANGGAL</th>
              <th style={headerCell({ width: '42%' })}>URAIAN KEGIATAN</th>
              <th style={headerCell({ width: '20%' })}>OUTPUT/HASIL</th>
              <th style={headerCell({ width: '15%' })}>
                PARAF ATASAN<br />LANGSUNG
              </th>
            </tr>
            {/* Sub-header numbering row */}
            <tr>
              {['1', '2', '3', '4', '5'].map((n) => (
                <td key={n} style={cell({ textAlign: 'center', fontStyle: 'italic', backgroundColor: '#f5f5f5' })}>
                  {n}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRecords.length > 0 ? (
              sortedRecords.map((record, index) => (
                <tr key={record.id}>
                  <td style={cell({ textAlign: 'center' })}>{index + 1}</td>
                  <td style={cell()}>{formatTanggal(record.tanggal, record.hari)}</td>
                  <td style={cell()}>{record.uraian_kegiatan}</td>
                  <td style={cell()}>{record.output_hasil}</td>
                  <td style={cell({ textAlign: 'center' })}>
                    {record.status === 'approved' ? '✓' : ''}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={cell({ textAlign: 'center', color: '#888', padding: '24px' })}>
                  Belum ada catatan untuk bulan ini
                </td>
              </tr>
            )}
            {/* Empty rows padding */}
            {sortedRecords.length > 0 && sortedRecords.length < 4 &&
              Array.from({ length: 4 - sortedRecords.length }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td style={cell({ padding: '18px 7px' })}>&nbsp;</td>
                  <td style={cell({ padding: '18px 7px' })}>&nbsp;</td>
                  <td style={cell({ padding: '18px 7px' })}>&nbsp;</td>
                  <td style={cell({ padding: '18px 7px' })}>&nbsp;</td>
                  <td style={cell({ padding: '18px 7px' })}>&nbsp;</td>
                </tr>
              ))
            }

            {/* NILAI (%) row */}
            <tr>
              <td
                colSpan={4}
                style={cell({ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' })}
              >
                NILAI (%)
              </td>
              <td style={cell({ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' })}>
                {nilaiPersen}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ===== KETERANGAN PENILAIAN ===== */}
        <div style={{ marginTop: '10px', fontSize: '9pt' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>*Keterangan Presentase Penilaian :</p>
          {KETERANGAN_PENILAIAN.map((ket, i) => (
            <p key={i} style={{ marginBottom: '2px' }}>
              {i + 1}. {ket}
            </p>
          ))}
        </div>

        {/* ===== AREA TANDA TANGAN ===== */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
          <tbody>
            <tr>
              <td style={{ ...cell({ width: '50%', padding: '8px 12px' }), textAlign: 'center' }}>
                ATASAN LANGSUNG
              </td>
              <td style={{ ...cell({ width: '50%', padding: '8px 12px' }), textAlign: 'center' }}>
                YANG MEMBUAT LAPORAN
              </td>
            </tr>
            <tr>
              <td style={{ ...cell({ height: '80px', padding: '8px 12px' }), textAlign: 'center', verticalAlign: 'middle' }}>
                {signature?.secretary_signature ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signature.secretary_signature}
                    alt="Tanda tangan atasan"
                    style={{ height: '60px', objectFit: 'contain', margin: '0 auto' }}
                  />
                ) : (
                  <span>&nbsp;</span>
                )}
              </td>
              <td style={{ ...cell({ height: '80px', padding: '8px 12px' }), textAlign: 'center' }}>
                &nbsp;
              </td>
            </tr>
            <tr>
              <td style={{ ...cell({ padding: '8px 12px' }), textAlign: 'center' }}>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                  {signature?.secretary_name || profile.nama_atasan || '________________________'}
                </p>
                <p>NIP. {signature?.secretary_nip || profile.nip_atasan || '________________________'}</p>
                {signedDate && (
                  <p style={{ fontSize: '8pt', color: '#555', marginTop: '4px' }}>
                    Ditandatangani: {signedDate}
                  </p>
                )}
              </td>
              <td style={{ ...cell({ padding: '8px 12px' }), textAlign: 'center' }}>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                  {profile.full_name || '________________________'}
                </p>
                <p>NIP. {profile.nip || '________________________'}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
