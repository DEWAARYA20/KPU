'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface BukuKendaliData {
  nama: string
  nip: string
  pangkat: string
  jabatan: string
  bulan: number
  tahun: number
  institusi?: string
  periodeText?: string
}

const MONTH_NAMES = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER',
]

export function BukuKendaliTemplate({ data }: { data: BukuKendaliData }) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (!printRef.current) return
    const content = printRef.current.innerHTML
    const printWindow = window.open('', '_blank', 'height=900,width=700')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cover Buku Kendali - ${data.periodeText || `${MONTH_NAMES[data.bulan - 1]} ${data.tahun}`}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: flex-start; padding: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }

  const monthName = MONTH_NAMES[data.bulan - 1] || ''

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          Cetak Cover
        </Button>
      </div>

      {/* Cover document */}
      <div className="flex justify-center">
        <div
          ref={printRef}
          style={{
            width: '400px',
            minHeight: '560px',
            border: '1.5px solid #aaa',
            backgroundColor: '#fff',
            fontFamily: 'Arial, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            padding: '0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
          }}
        >
          {/* Logo area */}
          <div style={{ textAlign: 'center', padding: '32px 32px 16px 32px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kpu-logo-sidebar.png"
              alt="Logo KPU"
              style={{ width: '100px', height: '100px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
            />
          </div>

          {/* Title area — salmon background */}
          <div style={{
            backgroundColor: '#f4c6a0',
            padding: '16px 32px',
            textAlign: 'center',
          }}>
            <p style={{ fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px', marginBottom: '6px' }}>
              BUKU KENDALI
            </p>
            <p style={{ fontWeight: 'bold', fontSize: '15px', letterSpacing: '0.5px' }}>
              {data.periodeText ? `PERIODE ${data.periodeText}` : `PERIODE BULAN ${monthName} ${data.tahun}`}
            </p>
          </div>

          {/* Divider */}
          <div style={{ height: '2px', backgroundColor: '#ccc' }} />

          {/* Info pegawai — gray background */}
          <div style={{
            backgroundColor: '#f2f2f2',
            padding: '24px 32px',
            flex: 1,
          }}>
            {[
              { label: 'NAMA', value: data.nama },
              { label: 'NIP', value: data.nip },
              { label: 'PANGKAT', value: data.pangkat },
              { label: 'JABATAN', value: data.jabatan },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', marginBottom: '14px', fontSize: '13px' }}>
                <span style={{ fontWeight: 'bold', width: '90px', flexShrink: 0 }}>{label}</span>
                <span style={{ width: '16px', flexShrink: 0, textAlign: 'center' }}>:</span>
                <span style={{ flex: 1, fontWeight: '500' }}>{value || '-'}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            textAlign: 'center',
            padding: '20px 32px 28px',
            borderTop: '1px solid #ddd',
            backgroundColor: '#fff',
          }}>
            <p style={{ fontWeight: '600', fontSize: '13px' }}>
              {data.institusi || 'Sekretariat KPU Kota Palu'}
            </p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Tahun {data.tahun}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
