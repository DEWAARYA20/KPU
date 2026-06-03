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
    let content = printRef.current.innerHTML

    // Resolve relative logo images to absolute URLs so they load in about:blank print window
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    content = content.replace(/src="\/kpu-logo-sidebar\.png"/g, `src="${origin}/kpu-logo-sidebar.png"`)
    content = content.replace(/src="\/kpu-logo\.png"/g, `src="${origin}/kpu-logo.png"`)

    const printWindow = window.open('', '_blank', 'height=900,width=700')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cover Buku Kendali - ${data.periodeText || `${MONTH_NAMES[data.bulan - 1]} ${data.tahun}`}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh;
              background-color: #fafafa;
              padding: 20px;
            }
            .cover-container {
              width: 100%;
              max-width: 400px;
              min-height: 560px;
              border: 1.5px solid #aaa;
              background-color: #fff;
              display: flex;
              flex-direction: column;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .cover-container * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            @media print {
              body { 
                padding: 0; 
                background-color: #fff;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                height: 100vh !important;
                width: 100vw !important;
              }
              .cover-container {
                border: 2px solid #333 !important;
                box-shadow: none !important;
                width: 170mm !important;
                height: 250mm !important;
                max-width: 170mm !important;
                min-height: 250mm !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                padding: 0 !important;
              }
              
              /* Scale up sizes for A4 print cover */
              .logo-area {
                padding: 50px 32px 30px !important;
              }
              .logo-img {
                width: 130px !important;
                height: 130px !important;
              }
              .title-area {
                padding: 30px 32px !important;
              }
              .title-large {
                font-size: 26px !important;
                letter-spacing: 2px !important;
                margin-bottom: 12px !important;
              }
              .title-medium {
                font-size: 18px !important;
                letter-spacing: 1px !important;
              }
              .divider-line {
                height: 2.5px !important;
              }
              .info-area {
                padding: 40px 60px !important;
              }
              .info-row {
                font-size: 16px !important;
                margin-bottom: 24px !important;
                font-weight: bold !important;
              }
              .info-label {
                width: 130px !important;
              }
              .footer-area {
                padding: 30px 32px 40px !important;
              }
              .footer-title {
                font-size: 16px !important;
              }
              .footer-subtitle {
                font-size: 14px !important;
                margin-top: 8px !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="cover-container">
            ${content}
          </div>
        </body>
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
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          {/* Logo area */}
          <div className="logo-area" style={{ textAlign: 'center', padding: '32px 32px 16px 32px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kpu-logo.png"
              alt="Logo KPU"
              className="logo-img"
              style={{ width: '100px', height: '100px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
            />
          </div>

          {/* Title area — salmon background */}
          <div className="title-area" style={{
            backgroundColor: '#f4c6a0',
            padding: '16px 32px',
            textAlign: 'center',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}>
            <p className="title-large" style={{ fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px', marginBottom: '6px' }}>
              BUKU KENDALI
            </p>
            <p className="title-medium" style={{ fontWeight: 'bold', fontSize: '15px', letterSpacing: '0.5px' }}>
              {data.periodeText ? `PERIODE ${data.periodeText}` : `PERIODE BULAN ${monthName} ${data.tahun}`}
            </p>
          </div>

          {/* Divider */}
          <div className="divider-line" style={{ height: '2px', backgroundColor: '#ccc' }} />

          {/* Info pegawai — gray background */}
          <div className="info-area" style={{
            backgroundColor: '#f2f2f2',
            padding: '24px 32px',
            flex: 1,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}>
            {[
              { label: 'NAMA', value: data.nama },
              { label: 'NIP', value: data.nip },
              { label: 'PANGKAT', value: data.pangkat },
              { label: 'JABATAN', value: data.jabatan },
            ].map(({ label, value }) => (
              <div key={label} className="info-row" style={{ display: 'flex', marginBottom: '14px', fontSize: '13px', fontWeight: 'bold' }}>
                <span className="info-label" style={{ fontWeight: 'bold', width: '90px', flexShrink: 0 }}>{label}</span>
                <span className="info-colon" style={{ width: '16px', flexShrink: 0, textAlign: 'center', fontWeight: 'bold' }}>:</span>
                <span className="info-value" style={{ flex: 1, fontWeight: 'bold' }}>{value || '-'}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="footer-area" style={{
            textAlign: 'center',
            padding: '20px 32px 28px',
            borderTop: '1px solid #ddd',
            backgroundColor: '#fff',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}>
            <p className="footer-title" style={{ fontWeight: '600', fontSize: '13px' }}>
              {data.institusi || 'Sekretariat KPU Kota Palu'}
            </p>
            <p className="footer-subtitle" style={{ fontSize: '12px', marginTop: '4px' }}>Tahun {data.tahun}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
