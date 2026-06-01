'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

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
}: SKPTemplateProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const skpItems = (profile.skp_items && profile.skp_items.length > 0)
    ? profile.skp_items
    : DEFAULT_SKP_ITEMS

  const handlePrint = () => {
    if (!printRef.current) return
    const content = printRef.current.innerHTML
    const printWindow = window.open('', '_blank', 'height=900,width=900')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Kinerja Harian - ${MONTH_NAMES[bulan - 1]} ${tahun}</title>
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
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Cetak Dokumen
          </Button>
        </div>
      )}

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
                LAPORAN KINERJA
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
